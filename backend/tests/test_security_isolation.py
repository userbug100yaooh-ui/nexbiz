"""Segurança multiempresa, papéis, demo somente leitura, estoque e financeiro.

Roda o app FastAPI EM PROCESSO (httpx.ASGITransport) contra o Mongo real. Só a
validação do token no Supabase é substituída (monkeypatch de lib.supabase_auth.validate),
porque criar usuários confirmados exige acesso administrativo ao projeto. Toda a cadeia
cookie → middleware → Ctx → get_company → consultas filtradas é a do código de produção.
"""

import httpx
import pytest
import pytest_asyncio

import server
from lib import supabase_auth
from lib.db import db

A, B = "test-iso-a", "test-iso-b"
pytestmark = pytest.mark.asyncio(loop_scope="module")  # motor fica preso a um único event loop

TOKENS = {"tok-a-admin": "uid-a-admin", "tok-a-vend": "uid-a-vend", "tok-b-admin": "uid-b-admin"}


@pytest_asyncio.fixture(loop_scope="module")
async def tenants(monkeypatch):
    async def fake_validate(token):
        return TOKENS.get(token)

    monkeypatch.setattr(supabase_auth, "validate", fake_validate)
    monkeypatch.setattr(supabase_auth, "configured", lambda: True)

    await cleanup()
    for cid in (A, B):
        await db.companies.insert_one({"id": cid, "name": f"Empresa {cid}", "legal_name": "", "cnpj": "", "segment": "", "email": "",
                                       "phone": "", "address": "", "city": "", "state": "", "plan": "trial"})
    users = [("u-a-admin", A, "admin", "uid-a-admin"), ("u-a-vend", A, "vendedor", "uid-a-vend"), ("u-b-admin", B, "admin", "uid-b-admin")]
    for uid, cid, role, sb in users:
        await db.users.insert_one({"id": uid, "company_id": cid, "name": uid, "email": f"{uid}@teste.nexbiz", "role": role, "supabase_user_id": sb})
    yield
    await cleanup()


async def cleanup():
    await db.companies.delete_many({"id": {"$in": [A, B]}})
    for name in ("users", "products", "clients", "services", "service_orders", "sales", "transactions"):
        await db[name].delete_many({"company_id": {"$in": [A, B]}})


def client_for(token=None, demo=False):
    cookies = {}
    if token:
        cookies["nexbiz_access"] = token
    if demo:
        cookies["nexbiz_demo"] = "1"
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=server.app), base_url="https://test/api", cookies=cookies)


PRODUCT = {"name": "Produto Sigiloso A", "price": 100.0, "cost": 60.0, "stock": 5, "min_stock": 1}


async def test_empresa_b_nao_ve_nem_altera_dados_da_empresa_a(tenants):
    async with client_for("tok-a-admin") as a, client_for("tok-b-admin") as b:
        r = await a.post("/products", json=PRODUCT)
        assert r.status_code == 201
        pid = r.json()["id"]
        assert r.json()["company_id"] == A
        await a.post("/clients", json={"name": "Cliente Sigiloso A"})

        assert all(p["name"] != PRODUCT["name"] for p in (await b.get("/products")).json())
        assert (await b.get("/clients")).json() == []
        assert (await b.get("/company")).json()["id"] == B
        assert (await b.put(f"/products/{pid}", json={**PRODUCT, "name": "hack"})).status_code == 404
        assert (await b.delete(f"/products/{pid}")).status_code == 404
        sale = await b.post("/sales", json={"items": [{"product_id": pid, "qty": 1}], "status": "pago", "payment_method": "Pix"})
        assert sale.status_code == 404  # B não consegue vender produto de A
        assert (await a.get("/products")).json()[0]["name"] == PRODUCT["name"]  # intacto


async def test_papeis_vendedor_nao_exclui_nem_altera_empresa(tenants):
    async with client_for("tok-a-admin") as admin, client_for("tok-a-vend") as vend:
        pid = (await admin.post("/products", json=PRODUCT)).json()["id"]
        assert (await vend.get("/products")).status_code == 200
        assert (await vend.delete(f"/products/{pid}")).status_code == 403
        assert (await vend.put("/company", json={"name": "hack"})).status_code == 403
        assert (await admin.put("/company", json={"name": "Nome Novo A"})).json()["name"] == "Nome Novo A"
        assert (await admin.delete(f"/products/{pid}")).status_code == 200


async def test_sem_sessao_token_invalido_e_demo_somente_leitura(tenants):
    async with client_for() as anon, client_for("token-falso", demo=True) as forged, client_for(demo=True) as demo:
        assert (await anon.get("/products")).status_code == 401
        assert (await anon.get("/auth/me")).status_code == 401
        # token Supabase inválido NUNCA cai silenciosamente na conta demo
        assert (await forged.get("/products")).status_code == 401
        assert (await demo.get("/products")).status_code == 200
        for method, path, body in [("post", "/products", PRODUCT), ("put", "/company", {"name": "x"}), ("delete", "/products/prd-001", None)]:
            r = await getattr(demo, method)(path, **({"json": body} if body else {}))
            assert r.status_code == 403, (method, path)
        assert (await demo.get("/auth/me")).json()["user"]["email"] == "demo@nexbiz.com.br"


async def test_validacoes_de_entrada(tenants):
    async with client_for("tok-a-admin") as a:
        assert (await a.post("/products", json={**PRODUCT, "price": -5})).status_code == 422
        assert (await a.post("/products", json={**PRODUCT, "stock": -1})).status_code == 422
        assert (await a.post("/products", json={**PRODUCT, "name": ""})).status_code == 422
        assert (await a.post("/transactions", json={"kind": "despesa", "description": "x", "amount": 0, "due_date": "2026-01-01"})).status_code == 422
        assert (await a.post("/transactions", json={"kind": "xyz", "description": "x", "amount": 10, "due_date": "2026-01-01"})).status_code == 422


async def test_vendas_estoque_e_financeiro_consistentes(tenants):
    async with client_for("tok-a-admin") as a:
        pid = (await a.post("/products", json=PRODUCT)).json()["id"]
        assert (await a.post("/sales", json={"items": [{"product_id": pid, "qty": 6}], "status": "pago", "payment_method": "Pix"})).status_code == 422
        sale = (await a.post("/sales", json={"items": [{"product_id": pid, "qty": 2}], "status": "pago", "payment_method": "Pix"})).json()
        assert sale["total"] == 200.0 and sale["code"] == "VND-0001"
        prod = next(p for p in (await a.get("/products")).json() if p["id"] == pid)
        assert prod["stock"] == 3
        trx = [t for t in (await a.get("/transactions")).json() if t["description"] == "Venda VND-0001"]
        assert len(trx) == 1 and trx[0]["amount"] == 200.0 and trx[0]["paid"] is True

        pend = (await a.post("/sales", json={"items": [{"product_id": pid, "qty": 1}], "status": "pendente", "payment_method": "Boleto"})).json()
        assert not [t for t in (await a.get("/transactions")).json() if t["description"] == f"Venda {pend['code']}"]
        await a.put(f"/sales/{pend['id']}", json={"status": "pago"})
        await a.put(f"/sales/{pend['id']}", json={"status": "pago"})  # idempotente
        assert len([t for t in (await a.get("/transactions")).json() if t["description"] == f"Venda {pend['code']}"]) == 1

        await a.put(f"/sales/{sale['id']}", json={"status": "cancelado"})
        prod = next(p for p in (await a.get("/products")).json() if p["id"] == pid)
        assert prod["stock"] == 4  # 5 - 2 - 1 + 2 devolvidos
        assert not [t for t in (await a.get("/transactions")).json() if t["description"] == "Venda VND-0001"]


async def test_ordem_de_servico_gera_receita_e_persistencia_apos_novo_login(tenants):
    async with client_for("tok-a-admin") as a:
        svc = (await a.post("/services", json={"name": "Serviço A", "price": 300})).json()
        os_ = (await a.post("/service-orders", json={"service_id": svc["id"]})).json()
        assert os_["price"] == 300 and os_["code"] == "OS-0001"
        await a.put(f"/service-orders/{os_['id']}", json={"status": "concluida"})
        assert len([t for t in (await a.get("/transactions")).json() if t["description"] == "OS OS-0001"]) == 1
    # "sair e entrar de novo": nova sessão do mesmo usuário enxerga tudo persistido
    async with client_for("tok-a-admin") as again:
        assert [s["name"] for s in (await again.get("/services")).json()] == ["Serviço A"]
        assert (await again.get("/service-orders")).json()[0]["status"] == "concluida"


async def test_importacao_respeita_empresa_e_limites(tenants):
    async with client_for("tok-a-admin") as a, client_for("tok-b-admin") as b:
        csv = "Nome;Preço;Estoque\nImportado A;1.234,56;3\nSem preço;;1\n".encode()
        r = await a.post("/import/products", files={"file": ("p.csv", csv, "text/csv")})
        assert r.json() == {"created": 1, "skipped": 1, "total": 2}
        assert next(p for p in (await a.get("/products")).json() if p["name"] == "Importado A")["price"] == 1234.56
        assert not (await b.get("/products")).json()
        big = b"Nome;Pre\xc3\xa7o\n" + b"x;1\n" * (5 * 1024 * 1024 // 4 + 10)
        assert (await a.post("/import/products", files={"file": ("big.csv", big, "text/csv")})).status_code == 413

"""Seed idempotente com os dados demonstrativos do NEXBIZ.

Uso:  cd /app/backend && python seed.py

Cria a empresa demo (NEXBIZ Comercial Ltda.) com usuários, produtos, clientes,
serviços, vendas e lançamentos financeiros distribuídos nos últimos ~90 dias.
Não é importado por server.py.
"""

import asyncio
import random
from datetime import date, datetime, timedelta, timezone
from typing import List

from lib.db import client, db, ensure_indexes
from models.entities import AppUser, Client, Company, Product, Sale, SaleItem, Service, Transaction

random.seed(42)

COMPANY_ID = "emp-nexbiz-001"
NOW = datetime.now(timezone.utc)
TODAY = NOW.date()

PAYMENT_METHODS = ["Pix", "Cartão de Crédito", "Boleto", "Transferência", "Dinheiro"]

# (nome, sku, categoria, preço, custo, estoque, estoque mínimo)
PRODUCT_ROWS = [
    ("Notebook Pro 15 i7 16GB", "NB-0015", "Informática", 4899.00, 3900.00, 8, 3),
    ("Monitor LED 27 4K", "MON-0027", "Informática", 1899.00, 1450.00, 12, 4),
    ("Mouse Sem Fio MX Master", "MOU-MX2", "Periféricos", 349.90, 210.00, 25, 8),
    ("Teclado Mecânico ABNT2", "TEC-AB2", "Periféricos", 289.90, 175.00, 6, 10),
    ("Headset Corporativo USB", "HED-USB", "Periféricos", 219.90, 130.00, 15, 6),
    ("Webcam Full HD 1080p", "WEB-1080", "Periféricos", 189.90, 98.00, 0, 5),
    ("SSD NVMe 1TB", "SSD-1TB", "Hardware", 549.90, 380.00, 18, 6),
    ("Memória RAM 16GB DDR4", "RAM-16G", "Hardware", 329.90, 215.00, 22, 8),
    ("Hub USB-C 7 em 1", "HUB-7P1", "Acessórios", 159.90, 84.00, 30, 10),
    ("Carregador Turbo 65W GaN", "CAR-65W", "Acessórios", 129.90, 62.00, 4, 8),
    ("Cabo HDMI 2.1 2m", "CAB-H21", "Acessórios", 49.90, 18.00, 60, 20),
    ("Suporte de Notebook Ajustável", "SUP-NB1", "Acessórios", 89.90, 41.00, 14, 5),
    ("Cadeira Ergonômica Diretor", "CAD-DIR", "Mobiliário", 1299.00, 890.00, 5, 2),
    ("Mesa Escritório 1.60m", "MES-160", "Mobiliário", 899.00, 610.00, 3, 3),
    ("Gaveteiro Mobile 3 Gavetas", "GAV-M03", "Mobiliário", 449.00, 290.00, 9, 3),
    ("Impressora Multifuncional Laser", "IMP-LAS", "Escritório", 1149.00, 870.00, 6, 2),
    ("Papel A4 Sulfite 75g (Caixa 5)", "PAP-A45", "Escritório", 129.90, 89.00, 40, 15),
    ("Organizador de Gavetas", "ORG-GAV", "Escritório", 34.90, 12.00, 2, 10),
]

# (nome, tipo, documento, e-mail, telefone, cidade, UF)
CLIENT_ROWS = [
    ("Tech Solutions Integradora LTDA", "PJ", "18.254.930/0001-22", "contato@techsolutions.com.br", "(11) 3555-1010", "São Paulo", "SP"),
    ("Padaria Pão de Ouro LTDA", "PJ", "22.847.105/0001-37", "financeiro@paodeouro.com.br", "(11) 3244-7890", "Santo André", "SP"),
    ("Construtora Almeida S.A.", "PJ", "05.932.481/0001-08", "compras@almeida.com.br", "(21) 2255-3322", "Rio de Janeiro", "RJ"),
    ("Clínica Vida Plena", "PJ", "31.704.568/0001-91", "admin@vidaplena.com.br", "(31) 3344-5566", "Belo Horizonte", "MG"),
    ("Auto Peças Menezes", "PJ", "44.128.730/0001-54", "menezes@autopecas.com.br", "(41) 3025-8877", "Curitiba", "PR"),
    ("Educa Mais Cursos LTDA", "PJ", "27.563.904/0001-16", "pedidos@educamais.com.br", "(11) 3777-2020", "Campinas", "SP"),
    ("Restaurante Sabor & Arte", "PJ", "39.810.642/0001-73", "contato@saborearte.com.br", "(11) 3811-4433", "São Paulo", "SP"),
    ("João Ferreira", "PF", "321.654.987-00", "joao.ferreira@email.com", "(11) 98888-1122", "São Paulo", "SP"),
    ("Maria Oliveira", "PF", "234.567.890-11", "maria.oliveira@email.com", "(11) 97777-2233", "Guarulhos", "SP"),
    ("Pedro Santos", "PF", "456.789.123-22", "pedro.santos@email.com", "(19) 96666-3344", "Campinas", "SP"),
    ("Ana Beatriz Costa", "PF", "567.891.234-33", "ana.costa@email.com", "(11) 95555-4455", "Osasco", "SP"),
    ("Rafael Mendes", "PF", "678.912.345-44", "rafael.mendes@email.com", "(13) 94444-5566", "Santos", "SP"),
    ("Juliana Paiva", "PF", "789.123.456-55", "juliana.paiva@email.com", "(11) 93333-6677", "São Bernardo do Campo", "SP"),
    ("Marcos Antônio Lima", "PF", "891.234.567-66", "marcos.lima@email.com", "(11) 92222-7788", "Diadema", "SP"),
]

# (nome, categoria, precificação, preço, horas estimadas, descrição)
SERVICE_ROWS = [
    ("Instalação de Redes e Wi-Fi", "Infraestrutura", "fixo", 800.00, 8.0, "Projeto, cabeamento e configuração de rede completa para escritórios e lojas."),
    ("Manutenção de Computadores", "Suporte técnico", "hora", 120.00, 3.0, "Diagnóstico, limpeza, upgrades e correção de falhas em desktops e notebooks."),
    ("Consultoria em TI", "Consultoria", "hora", 250.00, 6.0, "Planejamento de tecnologia, escolha de sistemas e redução de custos operacionais."),
    ("Criação de Sites Institucionais", "Desenvolvimento", "fixo", 3500.00, 40.0, "Site responsivo com até 5 páginas, formulário de contato e SEO básico."),
    ("Suporte Técnico Mensal", "Suporte técnico", "fixo", 990.00, 0.0, "Pacote recorrente de suporte remoto e presencial para até 10 máquinas."),
    ("Backup Gerenciado em Nuvem", "Nuvem", "fixo", 320.00, 0.0, "Backup diário automático, monitoramento e restauração assistida."),
    ("Configuração de Servidor Local", "Infraestrutura", "fixo", 1500.00, 12.0, "Instalação e configuração de servidor de arquivos e domínio local."),
    ("Treinamento de Equipe em Sistemas", "Treinamento", "hora", 180.00, 4.0, "Capacitação prática da equipe no uso dos sistemas de gestão."),
]


def build_users(company_id: str) -> List[AppUser]:
    created = NOW - timedelta(days=200)
    return [
        AppUser(id="usr-001", company_id=company_id, name="Ana Souza", email="ana@nexbiz.com.br", role="admin", created_at=created),
        AppUser(id="usr-002", company_id=company_id, name="Carlos Lima", email="carlos@nexbiz.com.br", role="gerente", created_at=created),
        AppUser(id="usr-003", company_id=company_id, name="Marina Costa", email="marina@nexbiz.com.br", role="vendedor", created_at=created),
    ]


def build_sales(company_id: str, clients: List[Client], products: List[Product]) -> List[Sale]:
    sales: List[Sale] = []
    for i in range(46):
        cli = random.choice(clients)
        items: List[SaleItem] = []
        for product in random.sample(products, k=random.randint(1, 3)):
            qty = random.randint(1, 3)
            items.append(
                SaleItem(product_id=product.id, name=product.name, qty=qty, price=product.price, total=round(product.price * qty, 2))
            )
        total = round(sum(i.total for i in items), 2)
        days_ago = int(random.triangular(0, 90, 10))  # concentra nas semanas recentes
        created = NOW - timedelta(days=days_ago, hours=random.randint(9, 18), minutes=random.randint(0, 59))
        r = random.random()
        status = "pago" if r < 0.70 else ("pendente" if r < 0.90 else "cancelado")
        sales.append(
            Sale(
                id=f"sal-{i + 1:03d}",
                company_id=company_id,
                code="",
                client_id=cli.id,
                client_name=cli.name,
                items=items,
                total=total,
                status=status,
                payment_method=random.choice(PAYMENT_METHODS),
                created_at=created,
            )
        )
    sales.sort(key=lambda s: s.created_at)
    for idx, sale in enumerate(sales, start=1):
        sale.code = f"VND-{idx:04d}"
    return sales


def month_shift(base: date, delta: int) -> date:
    total = base.year * 12 + (base.month - 1) + delta
    return date(total // 12, total % 12 + 1, 1)


def build_transactions(company_id: str, sales: List[Sale]) -> List[Transaction]:
    out: List[Transaction] = []
    n = 0

    for sale in sales:  # receitas espelham as vendas
        if sale.status == "cancelado":
            continue
        n += 1
        out.append(
            Transaction(
                id=f"trx-{n:03d}",
                company_id=company_id,
                kind="receita",
                description=f"Venda {sale.code}",
                category="Vendas",
                amount=sale.total,
                due_date=sale.created_at.date().isoformat(),
                paid=sale.status == "pago",
                method=sale.payment_method,
                created_at=sale.created_at,
            )
        )

    # Despesas recorrentes mensais (3 meses anteriores, atual e próxima)
    recurring = [
        (5, "Aluguel do escritório", "Aluguel", 3200.00, "Transferência"),
        (10, "Folha de pagamento", "Folha de pagamento", 8450.00, "Transferência"),
        (12, "Energia elétrica", "Energia", 0.0, "Boleto"),
        (15, "Internet dedicada", "Internet", 129.90, "Boleto"),
        (18, "Impostos (Simples Nacional)", "Impostos", 0.0, "Pix"),
        (20, "Reposição de fornecedores", "Fornecedores", 0.0, "Boleto"),
    ]
    variable_ranges = {"Energia": (320.0, 460.0), "Impostos": (1050.0, 1400.0), "Fornecedores": (2100.0, 3200.0)}
    for delta in (-3, -2, -1, 0, 1):
        first = month_shift(TODAY, delta)
        for day, desc, cat, value, method in recurring:
            due = first.replace(day=day)
            amount = value if value > 0 else round(random.uniform(*variable_ranges[cat]), 2)
            n += 1
            out.append(
                Transaction(
                    id=f"trx-{n:03d}",
                    company_id=company_id,
                    kind="despesa",
                    description=desc,
                    category=cat,
                    amount=amount,
                    due_date=due.isoformat(),
                    paid=due <= TODAY,
                    method=method,
                    created_at=datetime.combine(due, datetime.min.time(), tzinfo=timezone.utc),
                )
            )

    one_off = [
        ("Impulso de marketing digital", "Marketing", 980.00, 34),
        ("Licenças de software (anual)", "Software", 2400.00, 60),
        ("Café e copa para a equipe", "Outros", 187.40, 12),
    ]
    for desc, cat, amount, days_ago in one_off:
        due = TODAY - timedelta(days=days_ago)
        n += 1
        out.append(
            Transaction(
                id=f"trx-{n:03d}",
                company_id=company_id,
                kind="despesa",
                description=desc,
                category=cat,
                amount=amount,
                due_date=due.isoformat(),
                paid=True,
                method="Cartão de Crédito",
                created_at=datetime.combine(due, datetime.min.time(), tzinfo=timezone.utc),
            )
        )

    future_receivables = [
        ("Contrato de manutenção — Tech Solutions Integradora", "Serviços", 1980.00, 12, "Boleto"),
        ("Projeto de site — Educa Mais Cursos", "Serviços", 3500.00, 20, "Pix"),
        ("Locação de equipamentos — Construtora Almeida", "Outros", 760.00, 25, "Boleto"),
    ]
    for desc, cat, amount, in_days, method in future_receivables:
        due = TODAY + timedelta(days=in_days)
        n += 1
        out.append(
            Transaction(
                id=f"trx-{n:03d}",
                company_id=company_id,
                kind="receita",
                description=desc,
                category=cat,
                amount=amount,
                due_date=due.isoformat(),
                paid=False,
                method=method,
                created_at=NOW,
            )
        )
    return out


async def seed() -> None:
    for name in ("companies", "users", "products", "clients", "services", "sales", "transactions"):
        await db.drop_collection(name)
    await ensure_indexes()  # o drop descarta índices — recria

    company = Company(
        id=COMPANY_ID,
        name="NEXBIZ Comercial Ltda.",
        legal_name="NexBiz Comércio e Serviços Ltda.",
        cnpj="12.345.678/0001-90",
        segment="Comércio & Serviços",
        email="contato@nexbiz.com.br",
        phone="(11) 4002-8922",
        address="Av. Paulista, 1000 — Sala 42",
        city="São Paulo",
        state="SP",
        plan="profissional",
    )
    users = build_users(company.id)
    products = [
        Product(id=f"prd-{i:03d}", company_id=company.id, name=name, sku=sku, category=cat, price=price, cost=cost, stock=stock, min_stock=min_stock)
        for i, (name, sku, cat, price, cost, stock, min_stock) in enumerate(PRODUCT_ROWS, start=1)
    ]
    clients = [
        Client(id=f"cli-{i:03d}", company_id=company.id, name=name, kind=kind, document=document, email=email, phone=phone, city=city, state=state)
        for i, (name, kind, document, email, phone, city, state) in enumerate(CLIENT_ROWS, start=1)
    ]
    services = [
        Service(id=f"srv-{i:03d}", company_id=company.id, name=name, category=cat, pricing=pricing, price=price, estimated_hours=hours, description=desc)
        for i, (name, cat, pricing, price, hours, desc) in enumerate(SERVICE_ROWS, start=1)
    ]
    sales = build_sales(company.id, clients, products)
    transactions = build_transactions(company.id, sales)

    await db.companies.insert_one(company.model_dump())
    await db.users.insert_many([u.model_dump() for u in users])
    await db.products.insert_many([p.model_dump() for p in products])
    await db.clients.insert_many([c.model_dump() for c in clients])
    await db.services.insert_many([s.model_dump() for s in services])
    await db.sales.insert_many([s.model_dump() for s in sales])
    await db.transactions.insert_many([t.model_dump() for t in transactions])

    print("Seed NEXBIZ concluído:")
    for name in ("companies", "users", "products", "clients", "services", "sales", "transactions"):
        print(f"  {name}: {await db[name].count_documents({})}")


def main() -> None:
    asyncio.run(seed())
    client.close()


if __name__ == "__main__":
    main()

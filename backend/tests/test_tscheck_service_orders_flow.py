"""Criterion: Service Orders (Ordens de Servico) at /app/ordens-servico.

- Seed has 10 OS (OS-0001..OS-0010)
- Create new OS with chosen service -> price defaults to the service's price
- Complete OS -> status becomes 'concluida' and creates a 'OS OS-XXXX' receita in /financeiro (transactions)
- Delete OS removes it
"""

from tests.conftest import demo_session_client as _demo_client


def test_seed_has_ten_service_orders():
    client = _demo_client()
    try:
        resp = client.get("/service-orders")
        assert resp.status_code == 200
        orders = resp.json()
        codes = {o["code"] for o in orders}
        seeded = {f"OS-{i:04d}" for i in range(1, 11)}
        assert seeded.issubset(codes), f"missing seeded OS codes: {seeded - codes}"
    finally:
        client.close()


def test_create_complete_and_delete_service_order():
    client = _demo_client()
    try:
        services = client.get("/services").json()
        clients_ = client.get("/clients").json()
        assert services and clients_
        service = services[0]
        a_client = clients_[0]

        create_resp = client.post(
            "/service-orders",
            json={
                "client_id": a_client["id"],
                "service_id": service["id"],
                "scheduled_date": "2026-12-01",
                "notes": "tscheck-os-automated",
            },
        )
        assert create_resp.status_code == 201, create_resp.text
        os_doc = create_resp.json()
        assert os_doc["price"] == service["price"]
        os_id = os_doc["id"]
        os_code = os_doc["code"]

        complete_resp = client.put(f"/service-orders/{os_id}", json={"status": "concluida"})
        assert complete_resp.status_code == 200, complete_resp.text
        assert complete_resp.json()["status"] == "concluida"

        transactions = client.get("/transactions").json()
        matching = [t for t in transactions if t.get("description") == f"OS {os_code}"]
        assert matching, f"expected a receita 'OS {os_code}' in transactions"
        assert matching[0]["kind"] == "receita"
        assert matching[0]["amount"] == service["price"]

        delete_resp = client.delete(f"/service-orders/{os_id}")
        assert delete_resp.status_code == 200, delete_resp.text

        after = client.get("/service-orders").json()
        assert all(o["id"] != os_id for o in after)
    finally:
        client.close()

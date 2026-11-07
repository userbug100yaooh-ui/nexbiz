"""Criterion: import spreadsheet (CSV) for Products with pt-BR headers/values.

- CSV with Nome;SKU;Categoria;Preco headers and '12,90' style values -> imported products appear
- Response reports created/skipped counts
- File without a 'Nome' column -> 422
"""

import io
import time

from tests.conftest import demo_session_client as _demo_client


def test_import_products_csv_pt_br_success():
    client = _demo_client()
    try:
        unique = int(time.time())
        name = f"tscheck-produto-{unique}"
        csv_content = (
            "Nome;SKU;Categoria;Preço\n"
            f"{name};TSK-{unique};Geral;12,90\n"
        ).encode("utf-8")

        files = {"file": ("produtos.csv", io.BytesIO(csv_content), "text/csv")}
        resp = client.post("/import/products", files=files)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["created"] == 1, body
        assert body["skipped"] == 0
        assert body["total"] == 1

        products = client.get("/products").json()
        matches = [p for p in products if p["name"] == name]
        assert matches, "imported product should appear in /products"
        assert matches[0]["price"] == 12.90
    finally:
        client.close()


def test_import_products_csv_missing_name_column_returns_422():
    client = _demo_client()
    try:
        csv_content = "SKU;Categoria;Preço\nTSK-999;Geral;10,00\n".encode("utf-8")
        files = {"file": ("produtos_invalido.csv", io.BytesIO(csv_content), "text/csv")}
        resp = client.post("/import/products", files=files)
        assert resp.status_code == 422, resp.text
    finally:
        client.close()

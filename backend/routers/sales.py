"""Vendas e pedidos — criação baixa estoque e gera a receita correspondente."""

from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.entities import Client, Product, Sale, SaleIn, SaleItem, SaleUpdate
from routers.common import clean, get_company

router = APIRouter()

VALID_STATUSES = {"pago", "pendente", "cancelado"}


async def ensure_sale_revenue(company_id: str, sale: Sale) -> None:
    """Receita vinculada à venda (idempotente pelo código)."""
    existing = await db.transactions.find_one(
        {"company_id": company_id, "kind": "receita", "description": f"Venda {sale.code}"}
    )
    if existing:
        return
    from lib.dates import today_iso

    from models.entities import Transaction

    trx = Transaction(
        company_id=company_id,
        kind="receita",
        description=f"Venda {sale.code}",
        category="Vendas",
        amount=sale.total,
        due_date=today_iso(),
        paid=True,
        method=sale.payment_method,
    )
    await db.transactions.insert_one(trx.model_dump())


@router.get("/sales", response_model=List[Sale])
async def list_sales() -> List[Sale]:
    company = await get_company()
    docs = await db.sales.find({"company_id": company.id}).sort("created_at", -1).to_list(1000)
    return [Sale(**clean(d)) for d in docs]


@router.post("/sales", response_model=Sale, status_code=201)
async def create_sale(body: SaleIn) -> Sale:
    company = await get_company()
    if not body.items:
        raise HTTPException(status_code=422, detail="A venda precisa de pelo menos um item.")
    if body.status not in {"pago", "pendente"}:
        raise HTTPException(status_code=422, detail="Status inválido para nova venda.")

    items: List[SaleItem] = []
    total = 0.0
    for item in body.items:
        if item.qty <= 0:
            raise HTTPException(status_code=422, detail="Quantidade deve ser maior que zero.")
        prod_doc = await db.products.find_one({"id": item.product_id, "company_id": company.id})
        if not prod_doc:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")
        product = Product(**clean(prod_doc))
        if item.qty > product.stock:
            raise HTTPException(status_code=422, detail=f"Estoque insuficiente para {product.name} (disponível: {product.stock}).")
        line_total = round(product.price * item.qty, 2)
        items.append(
            SaleItem(product_id=product.id, name=product.name, qty=item.qty, price=product.price, total=line_total)
        )
        total += line_total

    client_name = "Consumidor final"
    if body.client_id:
        cli_doc = await db.clients.find_one({"id": body.client_id, "company_id": company.id})
        if cli_doc:
            client_name = Client(**clean(cli_doc)).name

    count = await db.sales.count_documents({"company_id": company.id})
    sale = Sale(
        company_id=company.id,
        code=f"VND-{count + 1:04d}",
        client_id=body.client_id,
        client_name=client_name,
        items=items,
        total=round(total, 2),
        status=body.status,
        payment_method=body.payment_method,
    )
    await db.sales.insert_one(sale.model_dump())

    for item in items:  # baixa no estoque
        await db.products.update_one({"id": item.product_id}, {"$inc": {"stock": -item.qty}})

    if body.status == "pago":
        await ensure_sale_revenue(company.id, sale)
    return sale


@router.put("/sales/{id}", response_model=Sale)
async def update_sale(id: str, body: SaleUpdate) -> Sale:
    company = await get_company()
    doc = await db.sales.find_one({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Venda não encontrada.")
    sale = Sale(**clean(doc))

    if body.status and body.status != sale.status:
        if body.status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="Status inválido.")
        if body.status == "cancelado":
            for item in sale.items:  # devolve ao estoque
                await db.products.update_one({"id": item.product_id}, {"$inc": {"stock": item.qty}})
            await db.transactions.delete_one(
                {"company_id": company.id, "kind": "receita", "description": f"Venda {sale.code}"}
            )
        if body.status == "pago":
            await ensure_sale_revenue(company.id, sale)
        sale.status = body.status
        await db.sales.replace_one({"id": id}, sale.model_dump())
    return sale

"""Ordens de serviço — CRUD com transição de status e receita ao concluir."""

from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.dates import today_iso
from models.entities import Client, Service, Transaction
from models.service_orders import ServiceOrder, ServiceOrderIn, ServiceOrderUpdate
from routers.common import clean, get_company, require_role

router = APIRouter()

VALID_STATUSES = {"aberta", "em_andamento", "concluida", "cancelada"}


async def ensure_os_revenue(company_id: str, order: ServiceOrder) -> None:
    """Ao concluir uma OS, gera a receita correspondente (idempotente pelo código)."""
    existing = await db.transactions.find_one(
        {"company_id": company_id, "kind": "receita", "description": f"OS {order.code}"}
    )
    if existing:
        return
    trx = Transaction(
        company_id=company_id,
        kind="receita",
        description=f"OS {order.code}",
        category="Serviços",
        amount=order.price,
        due_date=today_iso(),
        paid=False,
        method="Pix",
    )
    await db.transactions.insert_one(trx.model_dump())


@router.get("/service-orders", response_model=List[ServiceOrder])
async def list_service_orders() -> List[ServiceOrder]:
    company = await get_company()
    docs = await db.service_orders.find({"company_id": company.id}).sort("created_at", -1).to_list(1000)
    return [ServiceOrder(**clean(d)) for d in docs]


@router.post("/service-orders", response_model=ServiceOrder, status_code=201)
async def create_service_order(body: ServiceOrderIn) -> ServiceOrder:
    company = await get_company()
    if body.status not in {"aberta", "em_andamento", "concluida"}:
        raise HTTPException(status_code=422, detail="Status inválido para nova ordem de serviço.")
    svc_doc = await db.services.find_one({"id": body.service_id, "company_id": company.id})
    if not svc_doc:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    service = Service(**clean(svc_doc))

    client_name = "Consumidor final"
    if body.client_id:
        cli_doc = await db.clients.find_one({"id": body.client_id, "company_id": company.id})
        if cli_doc:
            client_name = Client(**clean(cli_doc)).name

    price = body.price if body.price is not None else service.price
    last = await db.service_orders.find({"company_id": company.id}).sort("code", -1).limit(1).to_list(1)
    next_n = int(last[0]["code"].split("-")[1]) + 1 if last else 1
    order = ServiceOrder(
        company_id=company.id,
        code=f"OS-{next_n:04d}",
        client_id=body.client_id,
        client_name=client_name,
        service_id=service.id,
        service_name=service.name,
        status=body.status,
        scheduled_date=body.scheduled_date,
        price=round(price, 2),
        notes=body.notes,
    )
    await db.service_orders.insert_one(order.model_dump())
    if body.status == "concluida":
        await ensure_os_revenue(company.id, order)
    return order


@router.put("/service-orders/{id}", response_model=ServiceOrder)
async def update_service_order(id: str, body: ServiceOrderUpdate) -> ServiceOrder:
    company = await get_company()
    doc = await db.service_orders.find_one({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada.")
    order = ServiceOrder(**clean(doc))

    if body.status and body.status != order.status:
        if body.status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="Status inválido.")
        if body.status == "concluida":
            await ensure_os_revenue(company.id, order)
        if body.status == "cancelada":
            await db.transactions.delete_one(
                {"company_id": company.id, "kind": "receita", "description": f"OS {order.code}"}
            )
        order.status = body.status
    if body.scheduled_date is not None:
        order.scheduled_date = body.scheduled_date
    if body.notes is not None:
        order.notes = body.notes
    await db.service_orders.replace_one({"id": id}, order.model_dump())
    return order


@router.delete("/service-orders/{id}", response_model=ServiceOrder)
async def delete_service_order(id: str) -> ServiceOrder:
    require_role("admin", "gerente")
    company = await get_company()
    doc = await db.service_orders.find_one_and_delete({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada.")
    await db.transactions.delete_one(
        {"company_id": company.id, "kind": "receita", "description": f"OS {doc['code']}"}
    )
    return ServiceOrder(**clean(doc))

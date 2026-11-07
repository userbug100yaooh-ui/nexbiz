"""Clientes (CRM)."""

from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.entities import Client, ClientIn
from routers.common import clean, get_company, require_role

router = APIRouter()


@router.get("/clients", response_model=List[Client])
async def list_clients() -> List[Client]:
    company = await get_company()
    docs = await db.clients.find({"company_id": company.id}).sort("name", 1).to_list(1000)
    return [Client(**clean(d)) for d in docs]


@router.post("/clients", response_model=Client, status_code=201)
async def create_client(body: ClientIn) -> Client:
    company = await get_company()
    obj = Client(company_id=company.id, **body.model_dump())
    await db.clients.insert_one(obj.model_dump())
    return obj


@router.put("/clients/{id}", response_model=Client)
async def update_client(id: str, body: ClientIn) -> Client:
    company = await get_company()
    doc = await db.clients.find_one({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    updated = Client(**{**clean(doc), **body.model_dump()})
    await db.clients.replace_one({"id": id}, updated.model_dump())
    return updated


@router.delete("/clients/{id}", response_model=Client)
async def delete_client(id: str) -> Client:
    require_role("admin", "gerente")
    company = await get_company()
    doc = await db.clients.find_one_and_delete({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return Client(**clean(doc))

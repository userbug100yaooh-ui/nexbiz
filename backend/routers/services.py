"""Catálogo de serviços."""

from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.entities import Service, ServiceIn
from routers.common import clean, get_company, require_role

router = APIRouter()


@router.get("/services", response_model=List[Service])
async def list_services() -> List[Service]:
    company = await get_company()
    docs = await db.services.find({"company_id": company.id}).sort("name", 1).to_list(1000)
    return [Service(**clean(d)) for d in docs]


@router.post("/services", response_model=Service, status_code=201)
async def create_service(body: ServiceIn) -> Service:
    company = await get_company()
    obj = Service(company_id=company.id, **body.model_dump())
    await db.services.insert_one(obj.model_dump())
    return obj


@router.put("/services/{id}", response_model=Service)
async def update_service(id: str, body: ServiceIn) -> Service:
    company = await get_company()
    doc = await db.services.find_one({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    updated = Service(**{**clean(doc), **body.model_dump()})
    await db.services.replace_one({"id": id}, updated.model_dump())
    return updated


@router.delete("/services/{id}", response_model=Service)
async def delete_service(id: str) -> Service:
    require_role("admin", "gerente")
    company = await get_company()
    doc = await db.services.find_one_and_delete({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    return Service(**clean(doc))

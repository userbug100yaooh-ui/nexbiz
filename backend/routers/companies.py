"""Empresa (configurações) e usuários do workspace."""

from typing import List

from fastapi import APIRouter

from lib.db import db
from models.entities import AppUser, Company, CompanyUpdate
from routers.common import clean, get_company, require_role

router = APIRouter()


@router.get("/company", response_model=Company)
async def read_company() -> Company:
    return await get_company()


@router.put("/company", response_model=Company)
async def update_company(body: CompanyUpdate) -> Company:
    require_role("admin")
    company = await get_company()
    changes = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if changes:
        await db.companies.update_one({"id": company.id}, {"$set": changes})
    doc = await db.companies.find_one({"id": company.id})
    return Company(**clean(doc))


@router.get("/users", response_model=List[AppUser])
async def list_users() -> List[AppUser]:
    company = await get_company()
    docs = await db.users.find({"company_id": company.id}).sort("created_at", 1).to_list(100)
    return [AppUser(**clean(d)) for d in docs]

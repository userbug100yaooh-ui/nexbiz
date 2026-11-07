"""Produtos e estoque."""

from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.entities import Product, ProductIn
from routers.common import clean, get_company

router = APIRouter()


@router.get("/products", response_model=List[Product])
async def list_products() -> List[Product]:
    company = await get_company()
    docs = await db.products.find({"company_id": company.id}).sort("name", 1).to_list(1000)
    return [Product(**clean(d)) for d in docs]


@router.post("/products", response_model=Product, status_code=201)
async def create_product(body: ProductIn) -> Product:
    company = await get_company()
    obj = Product(company_id=company.id, **body.model_dump())
    await db.products.insert_one(obj.model_dump())
    return obj


@router.put("/products/{id}", response_model=Product)
async def update_product(id: str, body: ProductIn) -> Product:
    company = await get_company()
    doc = await db.products.find_one({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    updated = Product(**{**clean(doc), **body.model_dump()})
    await db.products.replace_one({"id": id}, updated.model_dump())
    return updated


@router.delete("/products/{id}", response_model=Product)
async def delete_product(id: str) -> Product:
    company = await get_company()
    doc = await db.products.find_one_and_delete({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    return Product(**clean(doc))

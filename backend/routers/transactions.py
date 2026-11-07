"""Financeiro — lançamentos de receitas e despesas."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.entities import Transaction, TransactionIn
from routers.common import clean, get_company

router = APIRouter()


@router.get("/transactions", response_model=List[Transaction])
async def list_transactions(kind: Optional[str] = None) -> List[Transaction]:
    company = await get_company()
    query = {"company_id": company.id}
    if kind in {"receita", "despesa"}:
        query["kind"] = kind
    docs = await db.transactions.find(query).sort("due_date", -1).to_list(1000)
    return [Transaction(**clean(d)) for d in docs]


@router.post("/transactions", response_model=Transaction, status_code=201)
async def create_transaction(body: TransactionIn) -> Transaction:
    company = await get_company()
    if body.kind not in {"receita", "despesa"}:
        raise HTTPException(status_code=422, detail="Tipo deve ser 'receita' ou 'despesa'.")
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="O valor deve ser maior que zero.")
    obj = Transaction(company_id=company.id, **body.model_dump())
    await db.transactions.insert_one(obj.model_dump())
    return obj


@router.put("/transactions/{id}", response_model=Transaction)
async def update_transaction(id: str, body: TransactionIn) -> Transaction:
    company = await get_company()
    doc = await db.transactions.find_one({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    if body.kind not in {"receita", "despesa"}:
        raise HTTPException(status_code=422, detail="Tipo deve ser 'receita' ou 'despesa'.")
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="O valor deve ser maior que zero.")
    updated = Transaction(**{**clean(doc), **body.model_dump()})
    await db.transactions.replace_one({"id": id}, updated.model_dump())
    return updated


@router.delete("/transactions/{id}", response_model=Transaction)
async def delete_transaction(id: str) -> Transaction:
    company = await get_company()
    doc = await db.transactions.find_one_and_delete({"id": id, "company_id": company.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    return Transaction(**clean(doc))

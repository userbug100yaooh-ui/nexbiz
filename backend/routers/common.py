"""Helpers compartilhados pelos routers do NEXBIZ — escopo de empresa única (demo)."""

from typing import Any, Dict

from fastapi import HTTPException

from lib.db import db
from models.entities import Company


def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Remove o `_id` do Mongo antes de hidratar o modelo Pydantic."""
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def get_company() -> Company:
    """A empresa demonstrativa. O modelo já é multiempresa (`company_id` em todos os
    documentos); enquanto a autenticação é mock, todas as rotas escopam nesta empresa."""
    doc = await db.companies.find_one()
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma empresa cadastrada — execute o seed (cd /app/backend && python seed.py).",
        )
    return Company(**clean(doc))

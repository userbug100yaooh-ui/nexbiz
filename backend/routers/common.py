"""Helpers compartilhados pelos routers do NEXBIZ — escopo multiempresa por sessão."""

from typing import Any, Dict

from fastapi import HTTPException

from lib.db import db
from lib.tenant import current_ctx
from models.entities import Company


def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Remove o `_id` do Mongo antes de hidratar o modelo Pydantic."""
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def get_company() -> Company:
    """Empresa da sessão atual (resolvida pelo tenant_middleware a partir do cookie).
    Toda rota de negócio filtra por company.id — usuários nunca veem dados de outra empresa."""
    ctx = current_ctx.get()
    if ctx is None:
        raise HTTPException(status_code=401, detail="Sessão ausente ou expirada — faça login novamente.")
    doc = await db.companies.find_one({"id": ctx.company_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Empresa da sessão não encontrada.")
    return Company(**clean(doc))

"""Ordens de Serviço (OS) — vinculam serviços do catálogo a clientes.

Espelho manual em frontend/src/lib/types.ts (interface ServiceOrder) — manter em sincronia.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from models.entities import new_id, utcnow


class ServiceOrder(BaseModel):
    id: str = Field(default_factory=new_id)
    company_id: str
    code: str  # OS-0001
    client_id: str = ""
    client_name: str
    service_id: str
    service_name: str
    status: str = "aberta"  # aberta | em_andamento | concluida | cancelada
    scheduled_date: str = ""  # YYYY-MM-DD
    price: float
    notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class ServiceOrderIn(BaseModel):
    client_id: str = ""
    service_id: str
    status: str = "aberta"  # aberta | em_andamento | concluida
    scheduled_date: str = ""
    price: Optional[float] = None  # None → usa o preço do serviço
    notes: str = ""


class ServiceOrderUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_date: Optional[str] = None
    notes: Optional[str] = None

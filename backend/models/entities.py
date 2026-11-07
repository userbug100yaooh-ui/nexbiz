"""Modelos Pydantic v2 do NEXBIZ.

Cada modelo aqui tem um espelho manual em `frontend/src/lib/types.ts` — nada infere
a fronteira Python↔TypeScript; manter os dois em sincronia no mesmo lote de edição.

A estrutura já é multiempresa: todo documento carrega `company_id`, pronto para a
futura integração com Supabase/autenticação multiempresa.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """Agora em UTC consciente do fuso — armazenar consciente, serializar com offset."""
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- empresa & usuários


class Company(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    legal_name: str = ""
    cnpj: str = ""
    segment: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    plan: str = "trial"
    created_at: datetime = Field(default_factory=utcnow)


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    cnpj: Optional[str] = None
    segment: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class AppUser(BaseModel):
    id: str = Field(default_factory=new_id)
    company_id: str
    name: str
    email: str
    role: str = "admin"  # admin | gerente | vendedor
    supabase_user_id: str = ""  # vínculo com a identidade Supabase ("" = usuário demo/seed)
    created_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------- auth (mock)


class LoginIn(BaseModel):
    email: str
    password: str  # verificado pelo Supabase; nunca armazenado no Mongo


class SessionIn(BaseModel):
    access_token: str  # tokens do link de e-mail do Supabase (confirmação/recuperação)
    refresh_token: str


class EmailIn(BaseModel):
    email: str


class PasswordIn(BaseModel):
    password: str = Field(min_length=6, max_length=72)


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str  # repassado ao Supabase; nunca armazenado no Mongo
    company_name: str
    segment: str = "Comércio"
    cnpj: str = ""
    phone: str = ""
    city: str = ""
    state: str = ""


class AuthOut(BaseModel):
    user: AppUser
    company: Company
    mode: str = "demo"  # demo | supabase
    email_confirmation_required: bool = False


# ---------------------------------------------------------------- produtos


class Product(BaseModel):
    id: str = Field(default_factory=new_id)
    company_id: str
    name: str
    sku: str = ""
    category: str = "Geral"
    unit: str = "un"
    price: float
    cost: float = 0.0
    stock: int = 0
    min_stock: int = 0
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(default="", max_length=60)
    category: str = "Geral"
    unit: str = "un"
    price: float = Field(gt=0)
    cost: float = Field(default=0.0, ge=0)
    stock: int = Field(default=0, ge=0)
    min_stock: int = Field(default=0, ge=0)
    active: bool = True


# ---------------------------------------------------------------- clientes


class Client(BaseModel):
    id: str = Field(default_factory=new_id)
    company_id: str
    name: str
    kind: str = "PJ"  # PF | PJ
    document: str = ""  # CPF/CNPJ
    email: str = ""
    phone: str = ""
    city: str = ""
    state: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class ClientIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: str = "PJ"
    document: str = ""
    email: str = ""
    phone: str = ""
    city: str = ""
    state: str = ""
    notes: str = ""


# ---------------------------------------------------------------- serviços


class Service(BaseModel):
    id: str = Field(default_factory=new_id)
    company_id: str
    name: str
    description: str = ""
    category: str = "Geral"
    pricing: str = "fixo"  # fixo | hora
    price: float
    estimated_hours: float = 0.0
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)


class ServiceIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    category: str = "Geral"
    pricing: str = "fixo"
    price: float = Field(gt=0)
    estimated_hours: float = Field(default=0.0, ge=0)
    active: bool = True


# ---------------------------------------------------------------- vendas


class SaleItem(BaseModel):
    product_id: str = ""
    name: str
    qty: int
    price: float
    total: float


class SaleItemIn(BaseModel):
    product_id: str
    qty: int = Field(gt=0)


class Sale(BaseModel):
    id: str = Field(default_factory=new_id)
    company_id: str
    code: str  # VND-0001
    client_id: str = ""
    client_name: str
    items: List[SaleItem] = Field(default_factory=list)
    total: float
    status: str = "pendente"  # pago | pendente | cancelado
    payment_method: str = "Pix"
    created_at: datetime = Field(default_factory=utcnow)


class SaleIn(BaseModel):
    client_id: str = ""
    items: List[SaleItemIn]
    status: str = "pago"  # pago | pendente
    payment_method: str = "Pix"


class SaleUpdate(BaseModel):
    status: Optional[str] = None  # transição de status (marcar pago / cancelar)


# ---------------------------------------------------------------- financeiro


class Transaction(BaseModel):
    id: str = Field(default_factory=new_id)
    company_id: str
    kind: str  # receita | despesa
    description: str
    category: str = "Outros"
    amount: float
    due_date: str  # YYYY-MM-DD
    paid: bool = False
    method: str = "Pix"
    created_at: datetime = Field(default_factory=utcnow)


class TransactionIn(BaseModel):
    kind: str  # receita | despesa
    description: str = Field(min_length=1, max_length=300)
    category: str = "Outros"
    amount: float = Field(gt=0)
    due_date: str
    paid: bool = False
    method: str = "Pix"

"""Auth em modo demonstração — sem verificação real de senha (pedido do escopo).

A estrutura já prepara o multiempresa: cadastro cria Company + AppUser com
`company_id`; a troca para Supabase/auth real não muda o formato do payload.
"""

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.entities import AppUser, AuthOut, LoginIn, RegisterIn
from routers.common import clean, get_company

router = APIRouter()


@router.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn) -> AuthOut:
    """Login mock: a senha nunca é conferida. Um usuário semeado com o e-mail
    informado é devolvido; qualquer outro e-mail entra como admin da empresa demo."""
    company = await get_company()
    user_doc = await db.users.find_one({"email": body.email.strip().lower()})
    if not user_doc:
        user_doc = await db.users.find_one({"company_id": company.id, "role": "admin"})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Seed ausente — execute python seed.py.")
    return AuthOut(user=AppUser(**clean(user_doc)), company=company)


@router.post("/auth/register", response_model=AuthOut, status_code=201)
async def register(body: RegisterIn) -> AuthOut:
    """Cadastro de usuário + empresa (passo único no backend, 2 passos no frontend)."""
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail.")

    company = Company(
        name=body.company_name.strip(),
        segment=body.segment,
        cnpj=body.cnpj,
        email=email,
        phone=body.phone,
        city=body.city,
        state=body.state,
        plan="trial",
    )
    user = AppUser(company_id=company.id, name=body.name.strip(), email=email, role="admin")
    await db.companies.insert_one(company.model_dump())
    await db.users.insert_one(user.model_dump())
    return AuthOut(user=user, company=company)

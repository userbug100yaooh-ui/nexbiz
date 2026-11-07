"""Resolução de sessão → empresa (multiempresa), por requisição.

Cookies httpOnly:
  nexbiz_access / nexbiz_refresh — sessão Supabase (login real)
  nexbiz_demo=1                  — modo demonstração (empresa seed)
O middleware grava o contexto num ContextVar; routers.common.get_company() o lê,
garantindo que toda consulta é filtrada pelo company_id da sessão.
"""

from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any, Optional, Tuple

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from lib import supabase_auth
from lib.db import db

ACCESS = "nexbiz_access"
REFRESH = "nexbiz_refresh"
DEMO = "nexbiz_demo"
DEMO_USER_ID = "usr-001"
COOKIE_OPTS = dict(httponly=True, secure=True, samesite="lax", path="/", max_age=60 * 60 * 24 * 30)

# Rotas que gerenciam a própria sessão (não resolvidas pelo middleware)
SESSION_ROUTES = {"/api/auth/login", "/api/auth/register", "/api/auth/demo", "/api/auth/logout", "/api/auth/session", "/api/auth/forgot", "/api/auth/resend"}
READ_METHODS = {"GET", "HEAD", "OPTIONS"}


@dataclass
class Ctx:
    company_id: str
    user_id: str
    mode: str  # demo | supabase
    role: str = "vendedor"


current_ctx: ContextVar[Optional[Ctx]] = ContextVar("nexbiz_ctx", default=None)


def set_session_cookies(response: Response, session: Any) -> None:
    response.set_cookie(ACCESS, session.access_token, **COOKIE_OPTS)
    response.set_cookie(REFRESH, session.refresh_token, **COOKIE_OPTS)
    response.delete_cookie(DEMO, path="/")


def set_demo_cookie(response: Response) -> None:
    response.set_cookie(DEMO, "1", **COOKIE_OPTS)
    response.delete_cookie(ACCESS, path="/")
    response.delete_cookie(REFRESH, path="/")


def clear_cookies(response: Response) -> None:
    for name in (ACCESS, REFRESH, DEMO):
        response.delete_cookie(name, path="/")


async def resolve(request: Request) -> Tuple[Optional[Ctx], Any]:
    """Devolve (contexto, nova_sessão_se_houve_refresh)."""
    access = request.cookies.get(ACCESS)
    refresh_token = request.cookies.get(REFRESH)
    if (access or refresh_token) and supabase_auth.configured():
        uid = await supabase_auth.validate(access) if access else None
        new_session = None
        if not uid and refresh_token:
            new_session = await supabase_auth.refresh(refresh_token)
            if new_session:
                uid = await supabase_auth.validate(new_session.access_token)
        if uid:
            user = await db.users.find_one({"supabase_user_id": uid})
            if user:
                return Ctx(company_id=user["company_id"], user_id=user["id"], mode="supabase", role=user.get("role", "vendedor")), new_session
        return None, None  # sessão real inválida nunca cai silenciosamente no demo
    if request.cookies.get(DEMO) == "1":
        user = await db.users.find_one({"id": DEMO_USER_ID})
        if user:
            return Ctx(company_id=user["company_id"], user_id=user["id"], mode="demo", role=user.get("role", "admin")), None
    return None, None


async def tenant_middleware(request: Request, call_next):
    path = request.url.path
    if not path.startswith("/api") or path in SESSION_ROUTES:
        return await call_next(request)
    ctx, new_session = await resolve(request)
    if ctx and ctx.mode == "demo" and request.method not in READ_METHODS:
        return JSONResponse(
            status_code=403,
            content={"detail": "Conta demo é somente leitura — crie sua conta grátis para cadastrar e editar dados."},
        )
    token = current_ctx.set(ctx)
    try:
        response = await call_next(request)
    finally:
        current_ctx.reset(token)
    if new_session:
        set_session_cookies(response, new_session)
    return response

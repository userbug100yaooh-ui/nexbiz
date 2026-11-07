"""Autenticação: login real via Supabase (cookies httpOnly) + modo demonstração.

Supabase guarda identidade/senha; o Mongo guarda a empresa e o vínculo
(AppUser.supabase_user_id → company_id). Tokens nunca vão no JSON da resposta.
"""

import asyncio
import os

from fastapi import APIRouter, HTTPException, Request, Response

from lib import supabase_auth
from lib.db import db
from lib.tenant import ACCESS, COOKIE_OPTS, DEMO_USER_ID, REFRESH, clear_cookies, current_ctx, set_demo_cookie, set_session_cookies
from models.entities import AppUser, AuthOut, Company, EmailIn, LoginIn, PasswordIn, RegisterIn, SessionIn
from routers.common import clean

router = APIRouter()


def _require_supabase() -> None:
    if not supabase_auth.configured():
        raise HTTPException(status_code=503, detail="Login real indisponível: Supabase não configurado. Use a conta demo.")


async def _auth_out(user_doc: dict, mode: str, confirm: bool = False) -> AuthOut:
    company_doc = await db.companies.find_one({"id": user_doc["company_id"]})
    if not company_doc:
        raise HTTPException(status_code=404, detail="Empresa do usuário não encontrada.")
    return AuthOut(
        user=AppUser(**clean(user_doc)),
        company=Company(**clean(company_doc)),
        mode=mode,
        email_confirmation_required=confirm,
    )


@router.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn, response: Response) -> AuthOut:
    _require_supabase()
    email = body.email.strip().lower()
    try:
        res = await supabase_auth.sign_in(email, body.password)
    except Exception as exc:
        if supabase_auth.is_rate_limited(exc):
            raise HTTPException(status_code=429, detail="Muitas tentativas em pouco tempo — aguarde alguns minutos e tente novamente.")
        if supabase_auth.is_network_error(exc):
            raise HTTPException(status_code=503, detail="Não foi possível autenticar no Supabase — verifique a URL e a chave anon do projeto.")
        if "not confirmed" in str(exc).lower():
            raise HTTPException(status_code=403, detail="Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).")
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    set_session_cookies(response, res.session)
    return await _auth_out(await _link_user(res.user.id, email), "supabase")


async def _link_user(sb_uid: str, email: str) -> dict:
    """AppUser vinculado à identidade Supabase; vincula por e-mail ou cria empresa própria."""
    user_doc = await db.users.find_one({"supabase_user_id": sb_uid})
    if not user_doc:  # conta criada fora do app: vincula por e-mail ou cria a empresa
        user_doc = await db.users.find_one({"email": email, "id": {"$ne": DEMO_USER_ID}})
        if user_doc:
            await db.users.update_one({"id": user_doc["id"]}, {"$set": {"supabase_user_id": sb_uid}})
            user_doc["supabase_user_id"] = sb_uid
        else:
            company = Company(name=f"Empresa de {email.split('@')[0]}", email=email)
            user = AppUser(company_id=company.id, name=email.split("@")[0], email=email, role="admin", supabase_user_id=sb_uid)
            await db.companies.insert_one(company.model_dump())
            await db.users.insert_one(user.model_dump())
            user_doc = user.model_dump()
    return user_doc


@router.post("/auth/register", response_model=AuthOut, status_code=201)
async def register(body: RegisterIn, request: Request, response: Response) -> AuthOut:
    _require_supabase()
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email, "supabase_user_id": {"$nin": ["", None]}}):
        raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail.")
    origin = request.headers.get("origin") or os.environ.get("APP_URL", "")
    try:
        res = await supabase_auth.sign_up(email, body.password, f"{origin}/login")
    except Exception as exc:
        if supabase_auth.is_rate_limited(exc):
            raise HTTPException(status_code=429, detail="Muitas tentativas em pouco tempo — aguarde alguns minutos e tente novamente.")
        if supabase_auth.is_network_error(exc):
            raise HTTPException(status_code=503, detail="Não foi possível autenticar no Supabase — verifique a URL e a chave anon do projeto.")
        msg = str(exc).lower()
        if "already" in msg:
            raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail.")
        if "password" in msg:
            raise HTTPException(status_code=422, detail="Senha fraca — use pelo menos 6 caracteres.")
        raise HTTPException(status_code=400, detail="Não foi possível criar a conta. Verifique os dados.")
    sb_user, session = res.user, res.session
    identities = getattr(sb_user, "identities", None) if sb_user else None
    # Supabase devolve identities=[] (sem erro) quando o e-mail já existe e a confirmação está ativa
    if not sb_user or (identities is not None and len(identities) == 0):
        raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail.")

    company = Company(
        name=body.company_name.strip(), segment=body.segment, cnpj=body.cnpj, email=email,
        phone=body.phone, city=body.city, state=body.state, plan="trial",
    )
    user = AppUser(company_id=company.id, name=body.name.strip(), email=email, role="admin", supabase_user_id=sb_user.id)
    await db.companies.insert_one(company.model_dump())
    await db.users.insert_one(user.model_dump())
    if session:
        set_session_cookies(response, session)
    return AuthOut(user=user, company=company, mode="supabase", email_confirmation_required=session is None)


@router.post("/auth/demo", response_model=AuthOut)
async def demo(response: Response) -> AuthOut:
    """Entrada na empresa demonstrativa (dados seed) — sem senha."""
    user_doc = await db.users.find_one({"id": DEMO_USER_ID})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Dados demo ausentes — execute python seed.py.")
    set_demo_cookie(response)
    return await _auth_out(user_doc, "demo")


@router.get("/auth/me", response_model=AuthOut)
async def me() -> AuthOut:
    ctx = current_ctx.get()
    if ctx is None:
        raise HTTPException(status_code=401, detail="Sessão ausente ou expirada.")
    user_doc = await db.users.find_one({"id": ctx.user_id})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Usuário da sessão não encontrado.")
    return await _auth_out(user_doc, ctx.mode)


@router.post("/auth/logout", status_code=204)
async def logout(response: Response) -> Response:
    out = Response(status_code=204)
    clear_cookies(out)
    return out


def _origin(request: Request) -> str:
    return request.headers.get("origin") or os.environ.get("APP_URL", "")


def _auth_error(exc: Exception) -> HTTPException:
    if supabase_auth.is_rate_limited(exc):
        return HTTPException(status_code=429, detail="Muitas tentativas em pouco tempo — aguarde alguns minutos e tente novamente.")
    if supabase_auth.is_network_error(exc):
        return HTTPException(status_code=503, detail="Não foi possível autenticar no Supabase — verifique a URL e a chave anon do projeto.")
    return HTTPException(status_code=400, detail="Não foi possível concluir a operação. Tente novamente.")


@router.post("/auth/session", response_model=AuthOut)
async def open_session(body: SessionIn, response: Response) -> AuthOut:
    """Troca os tokens do link de e-mail (confirmação ou recuperação) por cookies httpOnly."""
    _require_supabase()
    uid = await supabase_auth.validate(body.access_token)
    if not uid:
        raise HTTPException(status_code=401, detail="Link inválido ou expirado — solicite um novo.")
    user = await asyncio.to_thread(lambda: supabase_auth._client().auth.get_user(body.access_token))
    email = (user.user.email or "").lower()
    user_doc = await _link_user(uid, email)
    response.set_cookie(ACCESS, body.access_token, **COOKIE_OPTS)
    response.set_cookie(REFRESH, body.refresh_token, **COOKIE_OPTS)
    response.delete_cookie("nexbiz_demo", path="/")
    return await _auth_out(user_doc, "supabase")


@router.post("/auth/forgot", status_code=202)
async def forgot_password(body: EmailIn, request: Request) -> dict:
    """Envia o e-mail de recuperação. Resposta idêntica exista ou não a conta (sem enumeração)."""
    _require_supabase()
    try:
        await supabase_auth.send_recovery(body.email.strip().lower(), f"{_origin(request)}/redefinir-senha")
    except Exception as exc:
        err = _auth_error(exc)
        if err.status_code in (429, 503):
            raise err
    return {"detail": "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha."}


@router.post("/auth/resend", status_code=202)
async def resend_confirmation(body: EmailIn, request: Request) -> dict:
    _require_supabase()
    try:
        await supabase_auth.resend_confirmation(body.email.strip().lower(), f"{_origin(request)}/login")
    except Exception as exc:
        err = _auth_error(exc)
        if err.status_code in (429, 503):
            raise err
    return {"detail": "Se houver um cadastro pendente, reenviamos o e-mail de confirmação."}


@router.post("/auth/password", status_code=204)
async def change_password(body: PasswordIn, request: Request) -> Response:
    """Define nova senha para a sessão Supabase atual (fluxo de recuperação)."""
    ctx = current_ctx.get()
    access, refresh_token = request.cookies.get(ACCESS), request.cookies.get(REFRESH)
    if ctx is None or ctx.mode != "supabase" or not access or not refresh_token:
        raise HTTPException(status_code=401, detail="Sessão ausente ou expirada — abra novamente o link do e-mail.")
    try:
        await supabase_auth.update_password(access, refresh_token, body.password)
    except Exception as exc:
        if "different" in str(exc).lower() or "same" in str(exc).lower():
            raise HTTPException(status_code=422, detail="A nova senha precisa ser diferente da anterior.")
        raise _auth_error(exc)
    return Response(status_code=204)

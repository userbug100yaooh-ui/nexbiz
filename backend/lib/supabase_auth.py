"""Supabase Auth como provedor de identidade (dados de negócio continuam no Mongo).

O SDK é síncrono — todas as chamadas rodam em thread. Chaves lidas de os.environ
em tempo de execução (SUPABASE_URL, SUPABASE_ANON_KEY); nunca vão para o frontend.
"""

import asyncio
import hashlib
import os
import time
from typing import Any, Optional, Tuple
from urllib.parse import urlparse

_cache: dict[str, Tuple[float, str]] = {}  # sha256(access) -> (expira_em, supabase_uid)
CACHE_TTL = 60.0


def configured() -> bool:
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_ANON_KEY"))


def is_rate_limited(exc: Exception) -> bool:
    """Supabase limita envios de e-mail/tentativas (HTTP 429)."""
    text = str(exc).lower()
    return getattr(exc, "status", None) == 429 or "rate limit" in text or "too many" in text


def is_network_error(exc: Exception) -> bool:
    """Falha de conexão/DNS ou de configuração (URL/chave inválida) — vira 503, nunca 'senha incorreta'."""
    name = type(exc).__name__
    text = str(exc).lower()
    return name in {"AuthRetryableError", "ConnectError", "ConnectTimeout", "ReadTimeout"} or any(
        s in text for s in ("name or service not known", "connection refused", "timed out", "nodename nor servname", "invalid api key")
    )


def _project_url() -> str:
    """URL do projeto, tolerando o engano comum '<ref>.supabase.com' (o correto é '.supabase.co')."""
    url = os.environ["SUPABASE_URL"].strip().strip('"').rstrip("/")
    host = urlparse(url).hostname or ""
    if host.endswith(".supabase.com") and host.count(".") == 2:
        url = url.replace(host, host[: -len(".com")] + ".co")
    return url


def _client() -> Any:
    from supabase import create_client  # import tardio: o server sobe mesmo sem o pacote/chaves

    # Cliente novo por operação — nunca compartilhar estado de sessão entre requisições.
    return create_client(_project_url(), os.environ["SUPABASE_ANON_KEY"])


async def validate(access_token: str) -> Optional[str]:
    """Valida o access token no Supabase (get_user) e devolve o uid; cache curto em memória."""
    key = hashlib.sha256(access_token.encode()).hexdigest()
    hit = _cache.get(key)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    try:
        res = await asyncio.to_thread(lambda: _client().auth.get_user(access_token))
        user = getattr(res, "user", None)
        if not user:
            return None
    except Exception:
        return None
    _cache[key] = (time.monotonic() + CACHE_TTL, user.id)
    if len(_cache) > 5000:
        _cache.clear()
    return user.id


async def refresh(refresh_token: str) -> Any:
    try:
        res = await asyncio.to_thread(lambda: _client().auth.refresh_session(refresh_token))
        return getattr(res, "session", None)
    except Exception:
        return None


async def sign_in(email: str, password: str) -> Any:
    return await asyncio.to_thread(
        lambda: _client().auth.sign_in_with_password({"email": email, "password": password})
    )


async def sign_up(email: str, password: str, redirect_to: str) -> Any:
    return await asyncio.to_thread(
        lambda: _client().auth.sign_up(
            {"email": email, "password": password, "options": {"email_redirect_to": redirect_to}}
        )
    )

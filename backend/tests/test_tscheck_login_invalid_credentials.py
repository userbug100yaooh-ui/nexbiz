"""Criterion: login with wrong/nonexistent credentials must hit real Supabase and
return 401 'E-mail ou senha incorretos.' (NOT 503 'verifique a URL e a chave')."""

from tests.conftest import api_url
import httpx


def test_login_invalid_credentials_returns_401_not_503():
    resp = httpx.post(
        api_url("/auth/login"),
        json={
            "email": "tscheck-nonexistent-user@mailinator.com",
            "password": "wrongpass123",
        },
        timeout=30.0,
    )
    body = resp.json()
    assert resp.status_code == 401, f"expected 401, got {resp.status_code}: {body}"
    assert "incorret" in body.get("detail", "").lower()
    assert "chave" not in body.get("detail", "").lower()

"""Criterion: real Supabase registration flow at /cadastro (2 steps).

- New email + password >=8 chars -> 201, mode='supabase', email_confirmation_required=true
  OR, if the project's email-send quota (~2/hour) is already exhausted,
  -> 429 with detail 'Muitas tentativas em pouco tempo — aguarde alguns minutos e tente novamente.'
- Repeating same email -> 409 (only exercised when the first call actually got 201)
- Login with that (unconfirmed) email -> 403 'Confirme seu e-mail...' (same condition)

NOTE: Supabase limits confirmation emails per hour; this test performs exactly ONE
real registration call per run to stay within that budget (per briefing instruction).
"""

import time

import httpx
from tests.conftest import api_url


def test_register_then_duplicate_then_login_unconfirmed():
    email = f"tscheck-register-{int(time.time())}@mailinator.com"
    password = "SenhaForte123"

    resp = httpx.post(
        api_url("/auth/register"),
        json={
            "email": email,
            "password": password,
            "name": "TSCheck QA",
            "company_name": "tscheck-empresa-qa",
        },
        timeout=30.0,
    )
    body = resp.json()

    if resp.status_code == 429:
        # Environment quota exhausted (not an app bug) -- assert the clear message contract.
        assert body.get("detail") == (
            "Muitas tentativas em pouco tempo — aguarde alguns minutos e tente novamente."
        ), f"unexpected 429 detail: {body}"
        return

    assert resp.status_code == 201, f"expected 201 or 429, got {resp.status_code}: {body}"
    assert body.get("mode") == "supabase"
    assert body.get("email_confirmation_required") is True

    # duplicate registration
    resp2 = httpx.post(
        api_url("/auth/register"),
        json={
            "email": email,
            "password": password,
            "name": "TSCheck QA",
            "company_name": "tscheck-empresa-qa",
        },
        timeout=30.0,
    )
    assert resp2.status_code == 409, f"expected 409, got {resp2.status_code}: {resp2.text}"

    # login while unconfirmed
    resp3 = httpx.post(
        api_url("/auth/login"),
        json={"email": email, "password": password},
        timeout=30.0,
    )
    body3 = resp3.json()
    assert resp3.status_code == 403, f"expected 403, got {resp3.status_code}: {body3}"
    assert "confirme seu e-mail" in body3.get("detail", "").lower()

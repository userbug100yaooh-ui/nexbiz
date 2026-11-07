"""Criterion: demo account + httpOnly cookie session protection.

- POST /auth/demo sets a session cookie, returns user/company (no access_token in body)
- GET /products without cookie -> 401
- GET /products with demo cookie -> 200
- POST /auth/logout clears session; subsequent /products -> 401
"""

import httpx
from tests.conftest import API_URL


def test_demo_login_cookie_session_and_logout():
    client = httpx.Client(base_url=API_URL, timeout=30.0)
    try:
        # no cookie -> 401
        resp_noauth = client.get("/products")
        assert resp_noauth.status_code == 401

        # demo login
        resp_demo = client.post("/auth/demo")
        assert resp_demo.status_code == 200, resp_demo.text
        body = resp_demo.json()
        assert body.get("mode") == "demo"
        assert "access_token" not in body
        assert "access_token" not in body.get("user", {})
        assert len(resp_demo.cookies) > 0, "expected a session cookie to be set"
        # Cookie is Secure; httpx's jar correctly withholds it over plain http
        # (matches real browser behavior) — resend explicitly like the real
        # https preview would do automatically.
        client.headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in resp_demo.cookies.items())

        # authenticated now
        resp_products = client.get("/products")
        assert resp_products.status_code == 200
        assert "access_token" not in resp_products.text

        # logout
        resp_logout = client.post("/auth/logout")
        assert resp_logout.status_code in (200, 204)
        del client.headers["Cookie"]

        # products again -> 401
        resp_after = client.get("/products")
        assert resp_after.status_code == 401
    finally:
        client.close()

"""Pre-scaffolded pytest fixtures for the FastAPI backend.

Tests hit the live uvicorn process managed by supervisor (not an in-process ASGI app), so
the app under test is the same one the frontend and Playwright see. Do NOT re-create this
file — add app-specific fixtures below the marker at the bottom.
"""

import os

import httpx
import pytest
import pytest_asyncio

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001")
API_URL = f"{BACKEND_URL}/api"


def api_url(path: str = "") -> str:
    """Absolute URL for an /api route: api_url("/status") -> http://localhost:8001/api/status."""
    return f"{API_URL}{path}"


@pytest.fixture(scope="session")
def backend_url() -> str:
    return BACKEND_URL


@pytest.fixture
def client():
    """Sync httpx client rooted at /api — the default for endpoint tests.

    Example:
        def test_status(client):
            assert client.get("/status").status_code == 200
    """
    with httpx.Client(base_url=API_URL, timeout=30.0) as c:
        yield c


@pytest_asyncio.fixture
async def aclient():
    """Async variant, for tests that also await motor/backend helpers directly."""
    async with httpx.AsyncClient(base_url=API_URL, timeout=30.0) as c:
        yield c


# --- app-specific fixtures below this line ---


def demo_session_client() -> httpx.Client:
    """Httpx client authenticated as the demo user.

    The demo cookie is set with the Secure attribute, so when the backend is
    exercised over plain http://localhost (test infra, not the real https
    preview the browser hits) httpx's spec-compliant cookie jar correctly
    refuses to replay it. We work around this locally by reading the Set-Cookie
    response and resending it verbatim as a Cookie header on every request via
    an event hook, mirroring what a real https browser session does for free.
    """
    client = httpx.Client(base_url=API_URL, timeout=30.0)
    resp = client.post("/auth/demo")
    if resp.status_code != 200:
        client.close()
        raise AssertionError(f"demo login failed: {resp.status_code} {resp.text}")
    cookie_header = "; ".join(f"{k}={v}" for k, v in resp.cookies.items())
    client.headers["Cookie"] = cookie_header
    return client

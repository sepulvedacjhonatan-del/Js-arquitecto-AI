"""Backend API tests for js.AI"""
import os, uuid, time
import pytest, requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://smart-app-maker-51.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@jsai.app"
DEMO_PASS = "demo1234"

@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=15)
    assert r.status_code == 200, f"demo login failed: {r.status_code} {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="session")
def headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}

# ---- Health ----
def test_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    j = r.json()
    assert j.get("status") == "ok"

# ---- Auth ----
class TestAuth:
    def test_register_and_login(self):
        email = f"test+{uuid.uuid4().hex[:8]}@jsai.app"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "test1234", "name": "Tester"}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["user"]["email"] == email

        # duplicate
        r2 = requests.post(f"{API}/auth/register", json={"email": email, "password": "test1234", "name": "Tester"}, timeout=15)
        assert r2.status_code == 400

        # login wrong pass
        r3 = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrongpass"}, timeout=15)
        assert r3.status_code == 401

        # login correct
        r4 = requests.post(f"{API}/auth/login", json={"email": email, "password": "test1234"}, timeout=15)
        assert r4.status_code == 200
        assert "token" in r4.json()

    def test_me_requires_token(self, demo_token):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401
        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo_token}"}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["email"] == DEMO_EMAIL

# ---- Chats CRUD ----
class TestChats:
    def test_chat_crud_and_message_flow(self, headers):
        # Create
        r = requests.post(f"{API}/chats", headers=headers, json={}, timeout=10)
        assert r.status_code == 200, r.text
        chat = r.json()
        cid = chat["id"]
        assert chat["title"] == "Nuevo chat"

        # List
        r2 = requests.get(f"{API}/chats", headers=headers, timeout=10)
        assert r2.status_code == 200
        assert any(c["id"] == cid for c in r2.json())

        # Rename
        r3 = requests.patch(f"{API}/chats/{cid}", headers=headers, json={"title": "TEST_renamed"}, timeout=10)
        assert r3.status_code == 200
        assert r3.json()["title"] == "TEST_renamed"

        # Send sync message (real LLM)
        payload = {"content": "Di 'hola' en una palabra."}
        r4 = requests.post(f"{API}/chats/{cid}/messages/sync", headers=headers, json=payload, timeout=90)
        assert r4.status_code == 200, r4.text
        m = r4.json()
        assert m["role"] == "assistant" and len(m["content"]) > 0

        # Get messages
        r5 = requests.get(f"{API}/chats/{cid}/messages", headers=headers, timeout=15)
        assert r5.status_code == 200
        msgs = r5.json()
        assert len(msgs) >= 2
        roles = [x["role"] for x in msgs]
        assert roles[0] == "user" and roles[-1] == "assistant"

        # Delete
        r6 = requests.delete(f"{API}/chats/{cid}", headers=headers, timeout=10)
        assert r6.status_code == 200

        # Verify deletion
        r7 = requests.get(f"{API}/chats/{cid}/messages", headers=headers, timeout=10)
        assert r7.status_code == 404

    def test_auto_title(self, headers):
        r = requests.post(f"{API}/chats", headers=headers, json={}, timeout=10)
        cid = r.json()["id"]
        first_msg = "TEST_autotitle probando el titulo automatico"
        r2 = requests.post(f"{API}/chats/{cid}/messages/sync", headers=headers, json={"content": first_msg}, timeout=90)
        assert r2.status_code == 200
        # Fetch list and confirm title changed
        r3 = requests.get(f"{API}/chats", headers=headers, timeout=10)
        chat = next(c for c in r3.json() if c["id"] == cid)
        assert chat["title"].startswith("TEST_autotitle"), f"title not auto-set: {chat['title']}"
        # cleanup
        requests.delete(f"{API}/chats/{cid}", headers=headers, timeout=10)

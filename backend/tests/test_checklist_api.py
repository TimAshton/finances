from tests.test_accounts_api import _make_account


def test_mark_and_unmark_paid(client):
    account = _make_account(client, balance=1000.0)

    assert client.get("/api/checklist/2026-10").json() == []

    response = client.put(f"/api/checklist/2026-10/{account['id']}")
    assert response.status_code == 200
    assert response.json()["account_id"] == account["id"]
    assert response.json()["month"] == "2026-10"

    # Idempotent: marking again doesn't create a duplicate.
    client.put(f"/api/checklist/2026-10/{account['id']}")
    assert len(client.get("/api/checklist/2026-10").json()) == 1
    # Months are tracked independently.
    assert client.get("/api/checklist/2026-11").json() == []

    response = client.delete(f"/api/checklist/2026-10/{account['id']}")
    assert response.status_code == 204
    assert client.get("/api/checklist/2026-10").json() == []


def test_marking_paid_does_not_change_balance(client):
    account = _make_account(client, balance=1000.0)
    client.put(f"/api/checklist/2026-10/{account['id']}")
    assert client.get(f"/api/accounts/{account['id']}").json()["balance"] == 1000.0


def test_checklist_validation(client):
    assert client.get("/api/checklist/2026-13").status_code == 422
    assert client.get("/api/checklist/oct").status_code == 422
    assert client.put("/api/checklist/2026-10/does-not-exist").status_code == 404


def test_reset_clears_checklist(client):
    account = _make_account(client)
    client.put(f"/api/checklist/2026-10/{account['id']}")
    assert client.post("/api/settings/reset").status_code == 204
    assert client.get("/api/checklist/2026-10").json() == []

import pytest


def _make_account(client, **overrides):
    payload = {
        "name": "Chase Sapphire",
        "category": "credit_card",
        "lender": "Chase",
        "balance": 5000.0,
        "interest_rate": 0.22,
        "credit_limit": 10000.0,
        "minimum_payment": 150.0,
        "due_day": 15,
        "notes": "",
    }
    payload.update(overrides)
    response = client.post("/api/accounts", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_list_account(client):
    account = _make_account(client)
    assert account["name"] == "Chase Sapphire"
    assert account["is_active"] is True

    response = client.get("/api/accounts")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_account_404(client):
    response = client.get("/api/accounts/does-not-exist")
    assert response.status_code == 404


def test_update_account(client):
    account = _make_account(client)
    response = client.patch(f"/api/accounts/{account['id']}", json={"balance": 4000.0})
    assert response.status_code == 200
    assert response.json()["balance"] == 4000.0


def test_deactivate_account_excluded_from_default_list(client):
    account = _make_account(client)
    response = client.delete(f"/api/accounts/{account['id']}")
    assert response.status_code == 204

    assert client.get("/api/accounts").json() == []
    response = client.get("/api/accounts?include_inactive=true")
    assert len(response.json()) == 1
    assert response.json()[0]["is_active"] is False


def test_create_payment_reduces_balance(client):
    account = _make_account(client, balance=1000.0)
    response = client.post(
        f"/api/accounts/{account['id']}/payments",
        json={"amount": 200.0, "paid_on": "2026-01-15", "notes": "extra payment"},
    )
    assert response.status_code == 201
    payment = response.json()
    assert payment["new_balance"] == 800.0

    updated = client.get(f"/api/accounts/{account['id']}").json()
    assert updated["balance"] == 800.0

    history = client.get(f"/api/accounts/{account['id']}/payments").json()
    assert len(history) == 1
    assert history[0]["amount"] == 200.0


def test_payment_cannot_take_balance_negative(client):
    account = _make_account(client, balance=100.0)
    response = client.post(
        f"/api/accounts/{account['id']}/payments", json={"amount": 500.0}
    )
    assert response.status_code == 201
    assert response.json()["new_balance"] == 0.0


def test_payoff_calculator_endpoint(client):
    account = _make_account(client, balance=1000.0, interest_rate=0.12)
    response = client.get(
        f"/api/accounts/{account['id']}/payoff-calculator", params={"payment": 100}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["months_to_payoff"] == pytest.approx(10.588644, abs=1e-4)
    assert body["payoff_impossible"] is False


def test_payoff_plan_endpoint(client):
    _make_account(client, name="A", balance=1000.0, interest_rate=0.24, minimum_payment=20)
    _make_account(client, name="B", balance=200.0, interest_rate=0.05, minimum_payment=20)

    response = client.post(
        "/api/payoff/plan", json={"extra_monthly_budget": 100, "strategy": "avalanche"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["strategy"] == "avalanche"
    assert len(body["accounts"]) == 2
    assert body["interest_saved"] >= 0


def test_settings_reset_clears_accounts(client):
    _make_account(client)
    response = client.post("/api/settings/reset")
    assert response.status_code == 204
    assert client.get("/api/accounts").json() == []

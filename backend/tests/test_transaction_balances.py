def test_revenue_increases_balance(api, register_user, account_factory):
    user = register_user()
    account = account_factory(user["token"], balance_initial=1000)

    resp = api.post(
        "/transactions",
        token=user["token"],
        json={"type": "REVENUE", "value": 200, "date": "2026-01-01", "description": "Salário", "accountId": account["id"]},
    )
    assert resp.status_code == 200

    updated = api.get(f"/accounts/{account['id']}", token=user["token"]).json()
    assert updated["balanceCurrent"] == 1200.0


def test_expense_decreases_balance(api, register_user, account_factory):
    user = register_user()
    account = account_factory(user["token"], balance_initial=1000)

    resp = api.post(
        "/transactions",
        token=user["token"],
        json={"type": "EXPENSE", "value": 150, "date": "2026-01-01", "description": "Mercado", "accountId": account["id"]},
    )
    assert resp.status_code == 200

    updated = api.get(f"/accounts/{account['id']}", token=user["token"]).json()
    assert updated["balanceCurrent"] == 850.0


def test_transfer_moves_value_between_accounts(api, register_user, account_factory):
    user = register_user()
    source = account_factory(user["token"], balance_initial=1000)
    dest = account_factory(user["token"], balance_initial=0)

    resp = api.post(
        "/transactions",
        token=user["token"],
        json={
            "type": "TRANSFER",
            "value": 300,
            "date": "2026-01-01",
            "description": "Transferência",
            "accountId": source["id"],
            "destinationAccountId": dest["id"],
        },
    )
    assert resp.status_code == 200

    source_after = api.get(f"/accounts/{source['id']}", token=user["token"]).json()
    dest_after = api.get(f"/accounts/{dest['id']}", token=user["token"]).json()
    assert source_after["balanceCurrent"] == 700.0
    assert dest_after["balanceCurrent"] == 300.0


def test_transfer_rejects_same_source_and_destination(api, register_user, account_factory):
    user = register_user()
    account = account_factory(user["token"], balance_initial=1000)

    resp = api.post(
        "/transactions",
        token=user["token"],
        json={
            "type": "TRANSFER",
            "value": 100,
            "date": "2026-01-01",
            "description": "Transferência inválida",
            "accountId": account["id"],
            "destinationAccountId": account["id"],
        },
    )
    assert resp.status_code == 400


def test_deleting_transaction_reverses_balance(api, register_user, account_factory):
    user = register_user()
    account = account_factory(user["token"], balance_initial=1000)

    tx = api.post(
        "/transactions",
        token=user["token"],
        json={"type": "EXPENSE", "value": 400, "date": "2026-01-01", "description": "Aluguel", "accountId": account["id"]},
    ).json()

    after_create = api.get(f"/accounts/{account['id']}", token=user["token"]).json()
    assert after_create["balanceCurrent"] == 600.0

    del_resp = api.delete(f"/transactions/{tx['id']}", token=user["token"])
    assert del_resp.status_code == 204

    after_delete = api.get(f"/accounts/{account['id']}", token=user["token"]).json()
    assert after_delete["balanceCurrent"] == 1000.0

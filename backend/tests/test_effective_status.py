def create_expense(api, token, account, **overrides):
    payload = {
        "type": "EXPENSE", "value": 50, "date": "2026-09-09",
        "dueDate": "2026-10-01", "description": "Compra",
        "accountId": account["id"], "effective": False,
        "attachmentsUrl": "receipt.png", "notes": "Manter observação",
        **overrides,
    }
    response = api.post("/transactions", token=token, json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def test_invoice_batch_preserves_data_and_other_invoices(api, register_user, account_factory):
    token = register_user()["token"]
    account = account_factory(token, balance_initial=1000)
    card_response = api.post("/cards", token=token, json={
        "name": "Cartão", "brand": "VISA", "limitTotal": 2000,
        "closingDay": 1, "dueDay": 10, "accountId": account["id"],
    })
    assert card_response.status_code == 200, card_response.text
    card = card_response.json()
    first = create_expense(api, token, account, creditCardId=card["id"])
    second = create_expense(api, token, account, creditCardId=card["id"])
    future = create_expense(api, token, account, creditCardId=card["id"], dueDate="2026-11-01")
    normal = create_expense(api, token, account)

    response = api.post("/transactions/effective-status", token=token, json={
        "transactionIds": [first["id"], second["id"]], "effective": True, "useDueDate": True,
    })
    assert response.status_code == 204, response.text
    for tx in (first, second):
        updated = api.get(f"/transactions/{tx['id']}", token=token).json()
        assert updated["effective"] is True
        assert updated["effectiveDate"] == "2026-10-01"
        for field in ("attachmentsUrl", "notes", "dueDate", "creditCardId", "value"):
            assert updated[field] == tx[field]
    for tx in (future, normal):
        assert api.get(f"/transactions/{tx['id']}", token=token).json()["effective"] is False

    response = api.post("/transactions/effective-status", token=token, json={
        "transactionIds": [first["id"], second["id"]], "effective": False,
    })
    assert response.status_code == 204
    for tx in (first, second):
        updated = api.get(f"/transactions/{tx['id']}", token=token).json()
        assert updated["effective"] is False
        assert updated["effectiveDate"] is None


def test_status_keeps_normal_balance_logic_and_is_idempotent(api, register_user, account_factory):
    token = register_user()["token"]
    account = account_factory(token, balance_initial=1000)
    tx = create_expense(api, token, account)
    for _ in range(2):
        response = api.post("/transactions/effective-status", token=token, json={
            "transactionIds": [tx["id"], tx["id"]], "effective": True, "effectiveDate": "2026-09-09",
        })
        assert response.status_code == 204
        assert api.get(f"/accounts/{account['id']}", token=token).json()["balanceCurrent"] == 950
    response = api.post("/transactions/effective-status", token=token, json={
        "transactionIds": [tx["id"]], "effective": False,
    })
    assert response.status_code == 204
    assert api.get(f"/accounts/{account['id']}", token=token).json()["balanceCurrent"] == 1000


def test_foreign_transaction_rejects_entire_batch(api, register_user, account_factory):
    owner = register_user()["token"]
    other = register_user()["token"]
    first = create_expense(api, owner, account_factory(owner, balance_initial=1000))
    foreign = create_expense(api, other, account_factory(other))
    response = api.post("/transactions/effective-status", token=owner, json={
        "transactionIds": [first["id"], foreign["id"]], "effective": True, "effectiveDate": "2026-09-09",
    })
    assert response.status_code == 404
    assert api.get(f"/transactions/{first['id']}", token=owner).json()["effective"] is False
    assert api.get(f"/transactions/{foreign['id']}", token=other).json()["effective"] is False

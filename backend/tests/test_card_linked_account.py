def test_linked_account_cannot_be_overridden_on_create_or_edit(api, register_user, account_factory):
    token = register_user()["token"]
    linked = account_factory(token)
    other = account_factory(token)
    card = api.post("/cards", token=token, json={
        "name": "Vinculado", "brand": "VISA", "limitTotal": 2000,
        "closingDay": 1, "dueDay": 10, "accountId": linked["id"],
    }).json()
    payload = {
        "description": "Compra", "type": "EXPENSE", "value": 50,
        "date": "2026-09-10", "effective": False,
        "creditCardId": card["id"], "accountId": other["id"],
    }
    created = api.post("/transactions", token=token, json=payload)
    assert created.status_code == 200, created.text
    assert created.json()["accountId"] == linked["id"]
    updated = api.put(f"/transactions/{created.json()['id']}", token=token, json={**payload, "description": "Editada"})
    assert updated.status_code == 200, updated.text
    assert updated.json()["accountId"] == linked["id"]
    assert updated.json()["description"] == "Editada"


def test_unlinked_card_allows_selected_account(api, register_user, account_factory):
    token = register_user()["token"]
    account = account_factory(token)
    card = api.post("/cards", token=token, json={
        "name": "Sem vínculo", "brand": "VISA", "limitTotal": 2000,
        "closingDay": 1, "dueDay": 10,
    }).json()
    response = api.post("/transactions", token=token, json={
        "description": "Compra", "type": "EXPENSE", "value": 50,
        "date": "2026-09-10", "effective": False,
        "creditCardId": card["id"], "accountId": account["id"],
    })
    assert response.status_code == 200, response.text
    assert response.json()["accountId"] == account["id"]

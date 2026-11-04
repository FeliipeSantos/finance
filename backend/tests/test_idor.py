def create_card(api, token, **overrides):
    body = {"name": "Cartão", "brand": "VISA", "limitTotal": 1000, "closingDay": 5, "dueDay": 10}
    body.update(overrides)
    return api.post("/cards", token=token, json=body)


def test_cannot_attach_transaction_to_another_users_card(api, register_user, account_factory):
    victim = register_user()
    attacker = register_user()

    victim_card = create_card(api, victim["token"]).json()

    resp = api.post(
        "/transactions",
        token=attacker["token"],
        json={
            "type": "EXPENSE",
            "value": 50,
            "date": "2026-01-01",
            "description": "Tentativa de IDOR",
            "creditCardId": victim_card["id"],
        },
    )
    assert resp.status_code == 400

    victim_card_after = api.get(f"/cards/{victim_card['id']}", token=victim["token"]).json()
    assert victim_card_after["limitUsed"] == 0.0


def test_cannot_link_card_to_another_users_account(api, register_user, account_factory):
    victim = register_user()
    attacker = register_user()

    victim_account = account_factory(victim["token"], balance_initial=100)

    resp = create_card(api, attacker["token"], accountId=victim_account["id"])
    assert resp.status_code == 400


def test_cannot_update_transaction_to_point_at_another_users_card(api, register_user, account_factory):
    victim = register_user()
    attacker = register_user()

    victim_card = create_card(api, victim["token"]).json()
    attacker_account = account_factory(attacker["token"], balance_initial=0)
    attacker_tx = api.post(
        "/transactions",
        token=attacker["token"],
        json={"type": "EXPENSE", "value": 10, "date": "2026-01-01", "description": "tx", "accountId": attacker_account["id"]},
    ).json()

    resp = api.put(
        f"/transactions/{attacker_tx['id']}",
        token=attacker["token"],
        json={
            "type": "EXPENSE",
            "value": 10,
            "date": "2026-01-01",
            "description": "tx",
            "accountId": attacker_account["id"],
            "creditCardId": victim_card["id"],
        },
    )
    assert resp.status_code == 400


def test_users_cannot_read_each_others_transactions(api, register_user, account_factory):
    victim = register_user()
    attacker = register_user()

    victim_account = account_factory(victim["token"], balance_initial=0)
    victim_tx = api.post(
        "/transactions",
        token=victim["token"],
        json={"type": "EXPENSE", "value": 10, "date": "2026-01-01", "description": "privado", "accountId": victim_account["id"]},
    ).json()

    resp = api.get(f"/transactions/{victim_tx['id']}", token=attacker["token"])
    assert resp.status_code == 404

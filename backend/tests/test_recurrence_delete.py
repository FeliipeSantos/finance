def create_parcelada(api, token, account_id, description, total_value, count):
    resp = api.post(
        "/transactions",
        token=token,
        json={
            "type": "EXPENSE",
            "value": total_value,
            "date": "2026-01-01",
            "description": description,
            "accountId": account_id,
            "recurrenceType": "PARCELADA",
            "installmentsCount": count,
        },
    )
    assert resp.status_code == 200
    return resp.json()


def test_deleting_all_of_one_series_does_not_touch_another_series_with_same_description_and_count(
    api, register_user, account_factory
):
    # Este é exatamente o cenário do finding: duas séries parceladas com a
    # mesma descrição base e o mesmo número de parcelas — antes da correção,
    # o agrupamento por regex sobre a descrição confundia as duas séries.
    user = register_user()
    account = account_factory(user["token"], balance_initial=1000)

    create_parcelada(api, user["token"], account["id"], "Compra", 300, 3)  # parcelas de 100
    create_parcelada(api, user["token"], account["id"], "Compra", 600, 3)  # parcelas de 200

    all_txs = api.get("/transactions", token=user["token"]).json()
    series_a = [t for t in all_txs if t["description"].startswith("Compra") and t["value"] == 100.0]
    series_b = [t for t in all_txs if t["description"].startswith("Compra") and t["value"] == 200.0]
    assert len(series_a) == 3
    assert len(series_b) == 3

    first_of_a = next(t for t in series_a if t["description"] == "Compra 1/3")
    del_resp = api.delete(f"/transactions/{first_of_a['id']}/recurrent?delete_type=ALL&reorganize=false", token=user["token"])
    assert del_resp.status_code == 204

    remaining = api.get("/transactions", token=user["token"]).json()
    assert len([t for t in remaining if t["value"] == 100.0]) == 0
    assert len([t for t in remaining if t["value"] == 200.0]) == 3


def test_current_and_future_keeps_past_installments(api, register_user, account_factory):
    user = register_user()
    account = account_factory(user["token"], balance_initial=1000)

    create_parcelada(api, user["token"], account["id"], "Assinatura", 300, 3)
    all_txs = api.get("/transactions", token=user["token"]).json()
    series = sorted((t for t in all_txs if t["description"].startswith("Assinatura")), key=lambda t: t["description"])
    second = next(t for t in series if t["description"] == "Assinatura 2/3")

    resp = api.delete(
        f"/transactions/{second['id']}/recurrent?delete_type=CURRENT_AND_FUTURE&reorganize=false", token=user["token"]
    )
    assert resp.status_code == 204

    remaining = api.get("/transactions", token=user["token"]).json()
    remaining_series = [t["description"] for t in remaining if t["description"].startswith("Assinatura")]
    assert remaining_series == ["Assinatura 1/3"]

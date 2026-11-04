from decimal import Decimal


def test_installment_rounding_difference_goes_to_first_installment(api, register_user, account_factory):
    user = register_user()
    account = account_factory(user["token"], balance_initial=0)

    resp = api.post(
        "/transactions",
        token=user["token"],
        json={
            "type": "EXPENSE",
            "value": 100,
            "date": "2026-01-01",
            "description": "Compra parcelada",
            "accountId": account["id"],
            "installmentsCount": 3,
        },
    )
    assert resp.status_code == 200
    installments = resp.json()["installments"]
    assert len(installments) == 3

    values = [Decimal(str(i["value"])) for i in installments]
    assert values[0] == Decimal("33.34")
    assert values[1] == Decimal("33.33")
    assert values[2] == Decimal("33.33")
    assert sum(values) == Decimal("100.00")


def test_parcelada_recurrence_creates_series_with_own_group(api, register_user, account_factory):
    user = register_user()
    account = account_factory(user["token"], balance_initial=0)

    resp = api.post(
        "/transactions",
        token=user["token"],
        json={
            "type": "EXPENSE",
            "value": 300,
            "date": "2026-01-01",
            "description": "Parcelas",
            "accountId": account["id"],
            "recurrenceType": "PARCELADA",
            "installmentsCount": 3,
        },
    )
    assert resp.status_code == 200

    all_txs = api.get("/transactions", token=user["token"]).json()
    series = [t for t in all_txs if t["description"].startswith("Parcelas")]
    assert len(series) == 3
    descriptions = sorted(t["description"] for t in series)
    assert descriptions == ["Parcelas 1/3", "Parcelas 2/3", "Parcelas 3/3"]

def test_only_unpaid_expenses_use_card_limit(api, register_user):
    token = register_user()['token']
    response = api.post('/cards', token=token, json={
        'name': 'Limite', 'brand': 'VISA', 'limitTotal': 1000,
        'initialInvoice': 25, 'closingDay': 1, 'dueDay': 10,
    })
    assert response.status_code == 200
    card = response.json()
    purchases = []
    for value, effective, due_date in [(100, True, '2026-09-10'), (200, False, '2026-10-10'), (300, False, '2027-01-10'), (-50, False, '2026-10-10')]:
        response = api.post('/transactions', token=token, json={
            'description': 'Compra', 'type': 'EXPENSE', 'value': value,
            'date': '2026-09-01', 'dueDate': due_date, 'effective': effective,
            'effectiveDate': '2026-09-10' if effective else None, 'creditCardId': card['id'],
        })
        assert response.status_code == 200, response.text
        if not effective:
            purchases.append(response.json()['id'])
    result = api.get(f"/cards/{card['id']}", token=token).json()
    assert result['limitUsed'] == 475
    assert result['limitAvailable'] == 525
    response = api.post('/transactions/effective-status', token=token, json={
        'transactionIds': purchases, 'effective': True, 'useDueDate': True,
    })
    assert response.status_code == 204
    result = api.get(f"/cards/{card['id']}", token=token).json()
    assert result['limitUsed'] == 25
    assert result['limitAvailable'] == 975

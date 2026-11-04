import pytest


def create_card(api, token, account_id):
    response = api.post('/cards', token=token, json={
        'name': 'Cartão teste', 'brand': 'VISA', 'limitTotal': 2000,
        'closingDay': 1, 'dueDay': 10, 'accountId': account_id,
    })
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize('effective', [False, True])
def test_delete_card_expense_preserves_account_balance_and_restores_limit(api, register_user, account_factory, effective):
    token = register_user()['token']
    account = account_factory(token, balance_initial=1000)
    card = create_card(api, token, account['id'])
    response = api.post('/transactions', token=token, json={
        'description': 'Compra', 'type': 'EXPENSE', 'value': 300,
        'date': '2026-09-23', 'dueDate': '2026-10-10',
        'effective': effective, 'creditCardId': card['id'],
    })
    assert response.status_code == 200, response.text
    tx = response.json()
    assert api.get(f"/cards/{card['id']}", token=token).json()['limitUsed'] == (0 if effective else 300)
    # Compras no cartão não debitam diretamente o saldo da conta vinculada.
    assert api.get(f"/accounts/{account['id']}", token=token).json()['balanceCurrent'] == 1000

    assert api.delete(f"/transactions/{tx['id']}", token=token).status_code == 204
    assert api.get('/transactions', token=token).json() == []
    assert api.get(f"/accounts/{account['id']}", token=token).json()['balanceCurrent'] == 1000
    updated = api.get(f"/cards/{card['id']}", token=token).json()
    assert updated['limitUsed'] == 0
    assert updated['limitAvailable'] == 2000


@pytest.mark.parametrize(('scope', 'remaining'), [
    ('ONLY_CURRENT', 2), ('CURRENT_AND_FUTURE', 1), ('ALL', 0),
])
def test_delete_card_installments_updates_limit(api, register_user, account_factory, scope, remaining):
    token = register_user()['token']
    account = account_factory(token, balance_initial=1000)
    card = create_card(api, token, account['id'])
    response = api.post('/transactions', token=token, json={
        'description': 'Compra parcelada', 'type': 'EXPENSE', 'value': 300,
        'date': '2026-09-23', 'dueDate': '2026-10-10', 'effective': False,
        'creditCardId': card['id'], 'recurrenceType': 'PARCELADA', 'installmentsCount': 3,
    })
    assert response.status_code == 200, response.text
    transactions = api.get('/transactions', token=token).json()
    second = next(tx for tx in transactions if tx['description'].endswith('2/3'))
    response = api.delete(
        f"/transactions/{second['id']}/recurrent?delete_type={scope}&reorganize=true", token=token,
    )
    assert response.status_code == 204, response.text
    transactions = api.get('/transactions', token=token).json()
    assert len(transactions) == remaining
    assert {tx['description'] for tx in transactions} == {
        f'Compra parcelada {index}/{remaining}' for index in range(1, remaining + 1)
    }
    updated = api.get(f"/cards/{card['id']}", token=token).json()
    assert updated['limitUsed'] == remaining * 100
    assert updated['limitAvailable'] == 2000 - remaining * 100
    assert api.get(f"/accounts/{account['id']}", token=token).json()['balanceCurrent'] == 1000

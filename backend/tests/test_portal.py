from datetime import date, datetime, timedelta, timezone
import uuid

import jwt
import pytest
import requests

from app.core.config import settings
from app.core.rate_limit import limiter
from app.database.connection import SessionLocal
from app.database.seeding import DEFAULT_CATEGORIES
from app.models.models import (
    User, Account, CreditCard, Category, Transaction, TransactionInstallment,
    Budget, Goal, Investment, InvestmentMovement, CustomIcon, Notification,
    Settings, AuditLog,
)


@pytest.fixture(autouse=True)
def reset_limit():
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def admin_token(api):
    response = api.post('/portal/login', json={'username': 'admin', 'password': settings.PORTAL_ADMIN_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()['token']


def remove_user(api, token, user, email=None):
    return requests.delete(
        api.base_url + '/portal/users/' + user['user_id'],
        headers={'Authorization': f'Bearer {token}'},
        json={'confirmationEmail': email or user['email']},
    )


def seed_financial_data(user):
    user_id = uuid.UUID(user['user_id'])
    with SessionLocal() as db:
        profile = db.get(User, user_id)
        profile.avatar_url = 'data:image/png;base64,example'
        profile.mfa_enabled = True
        account = Account(user_id=user_id, name='Banco', type='CHECKING', color='#111111')
        category = Category(user_id=user_id, name='Personalizada', type='EXPENSE')
        investment = Investment(user_id=user_id, name='Reserva', type='STOCK')
        db.add_all([account, category, investment])
        db.flush()
        card = CreditCard(user_id=user_id, account_id=account.id, name='Cartão', brand='VISA', limit_total=1000, closing_day=1, due_day=10)
        db.add(card)
        db.flush()
        tx = Transaction(user_id=user_id, account_id=account.id, destination_account_id=account.id,
                         credit_card_id=card.id, category_id=category.id, value=50, date=date.today(),
                         type='EXPENSE', description='Teste', effective=True)
        db.add(tx)
        db.flush()
        db.add_all([
            TransactionInstallment(transaction_id=tx.id, installment_number=1, total_installments=1, value=50, due_date=date.today()),
            InvestmentMovement(investment_id=investment.id, type='BUY', quantity=1, price=10, date=date.today()),
            Budget(user_id=user_id, category_id=category.id, limit_value=100, month=9, year=2026),
            Goal(user_id=user_id, name='Meta', target_value=100),
            CustomIcon(user_id=user_id, image_data='data:image/png;base64,test'),
            Notification(user_id=user_id, title='Teste', message='Mensagem'),
            Settings(user_id=user_id, theme='light'),
        ])
        db.commit()
        return {
            'transaction_id': tx.id, 'investment_id': investment.id,
            'password_hash': profile.password_hash, 'mfa_secret': profile.mfa_secret,
            'avatar_url': profile.avatar_url,
        }


def assert_financial_data_cleared(db, user, seeded):
    user_id = uuid.UUID(user['user_id'])
    for model in (Account, CreditCard, Transaction, Budget, Goal, Investment, CustomIcon, Notification, Settings):
        assert db.query(model).filter(model.user_id == user_id).count() == 0, model.__name__
    assert db.query(TransactionInstallment).filter_by(transaction_id=seeded['transaction_id']).count() == 0
    assert db.query(InvestmentMovement).filter_by(investment_id=seeded['investment_id']).count() == 0


def test_portal_requires_separate_admin_session(api, register_user, admin_token):
    user = register_user()
    assert api.get('/portal/users').status_code == 401
    assert api.get('/portal/users', token=user['token']).status_code == 401
    assert api.get('/auth/me', token=admin_token).status_code == 401
    for payload in ({'username': 'admin', 'password': 'wrong'}, {'username': user['email'], 'password': '123456'}):
        assert api.post('/portal/login', json=payload).status_code == 401
    assert api.post(f"/portal/users/{user['user_id']}/reset", token=user['token'], json={'confirmationEmail': user['email']}).status_code == 401
    assert remove_user(api, user['token'], user).status_code == 401
    assert api.get('/auth/me', token=user['token']).status_code == 200


def test_portal_rejects_expired_or_forged_tokens(api):
    payload = {'sub': 'portal-admin', 'aud': 'finance-portal', 'exp': datetime.now(timezone.utc) - timedelta(seconds=1)}
    expired = jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')
    payload['exp'] = datetime.now(timezone.utc) + timedelta(hours=1)
    forged = jwt.encode(payload, 'invalid-signing-key-for-portal-test', algorithm='HS256')
    for token in (expired, forged, 'invalid'):
        assert api.get('/portal/users', token=token).status_code == 401


def test_portal_lists_users_and_counts_without_secrets(api, register_user, admin_token):
    first, second = register_user(), register_user()
    seed_financial_data(first)
    response = api.get('/portal/users', token=admin_token)
    assert response.status_code == 200
    users = {item['id']: item for item in response.json()}
    assert first['user_id'] in users and second['user_id'] in users
    item = users[first['user_id']]
    assert (item['accountsCount'], item['cardsCount'], item['transactionsCount']) == (1, 1, 1)
    assert item['mfaEnabled'] is True
    assert set(item) == {'id', 'fullName', 'email', 'createdAt', 'mfaEnabled', 'accountsCount', 'cardsCount', 'transactionsCount'}


def test_reset_clears_only_target_data_and_preserves_login(api, register_user, admin_token):
    user, other = register_user(), register_user()
    seeded = seed_financial_data(user)
    other_seeded = seed_financial_data(other)
    with SessionLocal() as db:
        shared = Category(name='Global', type='EXPENSE')
        db.add(shared)
        db.commit()
        shared_id = shared.id
    response = api.post(f"/portal/users/{user['user_id']}/reset", token=admin_token, json={'confirmationEmail': user['email']})
    assert response.status_code == 200, response.text
    with SessionLocal() as db:
        assert_financial_data_cleared(db, user, seeded)
        profile = db.get(User, uuid.UUID(user['user_id']))
        assert profile.email == user['email']
        assert profile.password_hash == seeded['password_hash']
        assert profile.mfa_enabled and profile.mfa_secret == seeded['mfa_secret']
        assert profile.avatar_url == seeded['avatar_url']
        assert db.query(Category).filter_by(user_id=profile.id).count() == sum(1 + len(cat['subcategories']) for cat in DEFAULT_CATEGORIES)
        assert db.query(Category).filter_by(user_id=profile.id, name='Personalizada').count() == 0
        assert db.get(Category, shared_id) is not None
        assert db.get(Transaction, other_seeded['transaction_id']) is not None
        assert db.query(AuditLog).filter_by(user_id=profile.id, action='PORTAL_RESET').count() == 1
    assert api.get('/auth/me', token=user['token']).status_code == 200
    login = api.post('/auth/login', json={'email': user['email'], 'password': '123456'})
    assert login.status_code == 200 and login.json()['mfaRequired'] is True


def test_delete_removes_target_and_invalidates_access(api, register_user, admin_token):
    user, other = register_user(), register_user()
    seeded = seed_financial_data(user)
    response = remove_user(api, admin_token, user)
    assert response.status_code == 200, response.text
    with SessionLocal() as db:
        assert_financial_data_cleared(db, user, seeded)
        assert db.get(User, uuid.UUID(user['user_id'])) is None
        assert db.query(Category).filter_by(user_id=uuid.UUID(user['user_id'])).count() == 0
        assert db.query(AuditLog).filter_by(user_id=uuid.UUID(user['user_id'])).count() == 0
        assert db.get(User, uuid.UUID(other['user_id'])) is not None
    assert api.get('/auth/me', token=user['token']).status_code == 401
    assert api.post('/auth/login', json={'email': user['email'], 'password': '123456'}).status_code == 401
    assert api.get('/auth/me', token=other['token']).status_code == 200


def test_destructive_actions_require_matching_confirmation(api, register_user, admin_token):
    user = register_user()
    path = f"/portal/users/{user['user_id']}/reset"
    assert api.post(path, token=admin_token, json={}).status_code == 422
    assert api.post(path, token=admin_token, json={'confirmationEmail': 'wrong@example.com'}).status_code == 400
    assert remove_user(api, admin_token, user, 'wrong@example.com').status_code == 400
    missing = {'user_id': str(uuid.uuid4()), 'email': user['email']}
    assert remove_user(api, admin_token, missing).status_code == 404
    assert api.post(f"/portal/users/{missing['user_id']}/reset", token=admin_token, json={'confirmationEmail': missing['email']}).status_code == 404
    assert api.get('/auth/me', token=user['token']).status_code == 200


def test_portal_login_rate_limit(api):
    statuses = [api.post('/portal/login', json={'username': 'admin', 'password': 'wrong'}).status_code for _ in range(11)]
    assert statuses[0] == 401 and statuses[-1] == 429


def test_reset_rolls_back_if_reseeding_fails(api, register_user, admin_token, monkeypatch):
    from app.api import portal

    user = register_user()
    seeded = seed_financial_data(user)

    def fail_seed(db, user_id, *, commit):
        db.add(Category(user_id=user_id, name='Parcial', type='EXPENSE'))
        db.flush()
        raise RuntimeError('Simulated seed failure')

    monkeypatch.setattr(portal, 'seed_user_categories', fail_seed)
    response = api.post(f"/portal/users/{user['user_id']}/reset", token=admin_token, json={'confirmationEmail': user['email']})
    assert response.status_code == 500
    with SessionLocal() as db:
        user_id = uuid.UUID(user['user_id'])
        assert db.get(Transaction, seeded['transaction_id']) is not None
        assert db.query(Account).filter_by(user_id=user_id).count() == 1
        assert db.query(Category).filter_by(user_id=user_id, name='Personalizada').count() == 1
        assert db.query(Category).filter_by(user_id=user_id, name='Parcial').count() == 0
        assert db.query(AuditLog).filter_by(user_id=user_id, action='PORTAL_RESET').count() == 0


@pytest.mark.parametrize('action', ['reset', 'delete'])
def test_cleanup_with_foreign_keys_enforced(api, register_user, action):
    from app.api.portal import ConfirmAccount, reset_user, delete_user
    from sqlalchemy import text

    user = register_user()
    seed_financial_data(user)
    with SessionLocal() as db:
        db.execute(text('PRAGMA foreign_keys=ON'))
        assert db.execute(text('PRAGMA foreign_keys')).scalar() == 1
        operation = reset_user if action == 'reset' else delete_user
        operation(uuid.UUID(user['user_id']), ConfirmAccount(confirmation_email=user['email']), db)
        assert db.execute(text('PRAGMA foreign_key_check')).all() == []

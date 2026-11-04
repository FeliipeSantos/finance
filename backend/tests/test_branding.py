from urllib.parse import parse_qs, urlparse, unquote

import pytest
import requests

from app.core.config import settings
from app.core.rate_limit import limiter
from app.database.connection import SessionLocal
from app.models.models import PlatformBranding, AuditLog


PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
DEFAULT = {'name': 'Finance', 'iconData': None, 'faviconData': None}


@pytest.fixture(autouse=True)
def clean_branding():
    limiter.reset()
    with SessionLocal() as db:
        db.query(PlatformBranding).delete()
        db.commit()
    yield
    with SessionLocal() as db:
        db.query(PlatformBranding).delete()
        db.commit()
    limiter.reset()


@pytest.fixture
def admin_token(api):
    response = api.post('/portal/login', json={'username': 'admin', 'password': settings.PORTAL_ADMIN_PASSWORD})
    assert response.status_code == 200
    return response.json()['token']


def save(api, token, payload):
    return requests.put(api.base_url + '/portal/branding', json=payload,
                        headers={'Authorization': f'Bearer {token}'} if token else {})


def test_public_defaults_and_admin_only_write(api, register_user):
    assert api.get('/portal/branding').json() == DEFAULT
    assert save(api, None, {'name': 'Outra'}).status_code == 401
    assert save(api, register_user()['token'], {'name': 'Outra'}).status_code == 401
    assert api.get('/portal/branding').json() == DEFAULT


def test_persistence_images_and_reset_to_defaults(api, admin_token):
    payload = {'name': '  Minha Plataforma  ', 'iconData': PNG, 'faviconData': PNG}
    expected = {**payload, 'name': 'Minha Plataforma'}
    response = save(api, admin_token, payload)
    assert response.status_code == 200, response.text
    assert response.json() == expected
    assert api.get('/portal/branding').json() == expected
    with SessionLocal() as db:
        assert db.get(PlatformBranding, 1).name == expected['name']
        assert db.query(AuditLog).filter_by(action='PORTAL_UPDATE', entity_name='PLATFORM_BRANDING').count() >= 1
    assert save(api, admin_token, {'name': '   ', 'iconData': '', 'faviconData': None}).json() == DEFAULT
    assert api.get('/portal/branding').json() == DEFAULT


@pytest.mark.parametrize('payload', [
    {'name': 'x' * 81},
    {'iconData': 'https://example.com/image.png'},
    {'faviconData': 'data:image/svg+xml;base64,PHN2Zz4='},
    {'iconData': 'data:image/png;base64,bm90IGFuIGltYWdl'},
    {'faviconData': 'x' * 350_001},
])
def test_invalid_settings_do_not_change_branding(api, admin_token, payload):
    assert save(api, admin_token, payload).status_code == 422
    assert api.get('/portal/branding').json() == DEFAULT


def test_mfa_uses_encoded_platform_name(api, admin_token, register_user):
    name = 'Minha Marca & Gestão'
    assert save(api, admin_token, {'name': name}).status_code == 200
    user = register_user()
    setup = api.get('/auth/mfa/setup', token=user['token'])
    assert setup.status_code == 200
    uri = urlparse(setup.json()['qrCodeUrl'])
    assert parse_qs(uri.query)['issuer'] == [name]
    assert unquote(uri.path) == f"/{name}:{user['email']}"


def test_pdf_uses_escaped_platform_name(api, admin_token, register_user, monkeypatch):
    from app.services import reports
    captured = {}

    class FakeHTML:
        def __init__(self, string):
            captured['html'] = string

        def write_pdf(self):
            return b'%PDF-test'

    monkeypatch.setattr(reports, 'HTML', FakeHTML)
    assert save(api, admin_token, {'name': '<Marca> & Cia'}).status_code == 200
    user = register_user()
    import uuid
    with SessionLocal() as db:
        assert reports.ReportService.export_transactions_pdf(db, uuid.UUID(user['user_id'])) == b'%PDF-test'
    assert '&lt;Marca&gt; &amp; Cia - Relatório Financeiro' in captured['html']
    assert 'FinControl' not in captured['html']

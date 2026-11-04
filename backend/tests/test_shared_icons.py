import base64
from datetime import datetime
import uuid

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import limiter
from app.database.connection import Base, SessionLocal
from app.database.shared_icons_migration import migrate_shared_icons
from app.models.models import User, CustomIcon, SharedIcon, Account


PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='


@pytest.fixture
def admin(api):
    limiter.reset()
    response = api.post('/portal/login', json={'username': 'admin', 'password': settings.PORTAL_ADMIN_PASSWORD})
    assert response.status_code == 200
    yield response.json()['token']
    limiter.reset()


@pytest.fixture
def shared(api, admin):
    response = api.post('/portal/shared-icons', token=admin, json={'imageData': PNG})
    assert response.status_code == 200, response.text
    icon = response.json()
    yield icon
    with SessionLocal() as db:
        db.query(SharedIcon).filter_by(id=uuid.UUID(icon['id'])).delete()
        db.commit()


def test_portal_icons_are_visible_to_every_user_but_only_admin_can_manage(api, register_user, admin, shared):
    first, second = register_user(), register_user()
    for user in (first, second):
        visible = api.get('/custom-icons', token=user['token']).json()
        icon = next(item for item in visible if item['id'] == shared['id'])
        assert icon['isShared'] is True and icon['canDelete'] is False
        assert api.delete('/custom-icons/' + shared['id'], token=user['token']).status_code == 404
        assert api.get('/portal/shared-icons', token=user['token']).status_code == 401
        assert api.post('/portal/shared-icons', token=user['token'], json={'imageData': PNG}).status_code == 401
        assert api.delete('/portal/shared-icons/' + shared['id'], token=user['token']).status_code == 401
    assert api.get('/portal/shared-icons').status_code == 401
    portal_icons = api.get('/portal/shared-icons', token=admin).json()
    assert any(item['id'] == shared['id'] and item['canDelete'] for item in portal_icons)
    duplicate = api.post('/portal/shared-icons', token=admin, json={'imageData': PNG}).json()
    assert duplicate['id'] == shared['id']
    duplicate_from_user = api.post('/custom-icons', token=first['token'], json={'imageData': PNG}).json()
    assert duplicate_from_user['id'] == shared['id'] and not duplicate_from_user['canDelete']


def test_oldest_user_uploads_are_now_private(api, register_user):
    first, second = register_user(), register_user()
    with SessionLocal() as db:
        db.get(User, uuid.UUID(first['user_id'])).created_at = datetime(1990, 1, 1)
        db.commit()
    private = api.post('/custom-icons', token=first['token'], json={'imageData': 'private-' + uuid.uuid4().hex}).json()
    assert private['canDelete'] and not private['isShared']
    assert private['id'] not in {icon['id'] for icon in api.get('/custom-icons', token=second['token']).json()}
    assert api.delete('/custom-icons/' + private['id'], token=second['token']).status_code == 404
    assert api.delete('/custom-icons/' + private['id'], token=first['token']).status_code == 204


def test_shared_library_survives_user_reset_and_deletion(api, register_user, admin, shared):
    from app.api.portal import delete_user, ConfirmAccount

    user = register_user()
    assert api.post(f"/portal/users/{user['user_id']}/reset", token=admin, json={'confirmationEmail': user['email']}).status_code == 200
    assert shared['id'] in {icon['id'] for icon in api.get('/custom-icons', token=user['token']).json()}
    with SessionLocal() as db:
        delete_user(uuid.UUID(user['user_id']), ConfirmAccount(confirmation_email=user['email']), db)
        assert db.get(SharedIcon, uuid.UUID(shared['id'])) is not None


def test_removal_preserves_applied_images_and_private_library(api, register_user, account_factory, admin, shared):
    user = register_user()
    account = account_factory(user['token'])
    with SessionLocal() as db:
        db.get(Account, uuid.UUID(account['id'])).custom_icon_url = PNG
        private = CustomIcon(user_id=uuid.UUID(user['user_id']), image_data=PNG)
        db.add(private)
        db.commit()
        private_id = str(private.id)
    assert api.delete('/portal/shared-icons/' + private_id, token=admin).status_code == 404
    assert api.delete('/portal/shared-icons/' + shared['id'], token=admin).status_code == 204
    icons = api.get('/custom-icons', token=user['token']).json()
    assert shared['id'] not in {icon['id'] for icon in icons}
    assert private_id in {icon['id'] for icon in icons}
    assert api.get('/accounts/' + account['id'], token=user['token']).json()['customIconUrl'] == PNG


@pytest.mark.parametrize('image', ['', 'https://example.com/image.png', 'data:image/png;base64,broken', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,' + base64.b64encode(b'not png').decode()])
def test_shared_upload_validates_image(api, admin, image):
    assert api.post('/portal/shared-icons', token=admin, json={'imageData': image}).status_code == 422


@pytest.fixture
def legacy_engine():
    engine = create_engine('sqlite://')
    @event.listens_for(engine, 'connect')
    def enable_foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


def test_migration_transfers_existing_library_once_and_survives_old_owner_deletion(legacy_engine):
    with Session(legacy_engine) as db:
        owner = User(full_name='Felipe', email='felipe@test.com', password_hash='unused', created_at=datetime(2020, 1, 1))
        other = User(full_name='Outro', email='other@test.com', password_hash='unused', created_at=datetime(2021, 1, 1))
        db.add_all([owner, other])
        db.flush()
        old_icon = CustomIcon(user_id=owner.id, image_data=PNG)
        private = CustomIcon(user_id=other.id, image_data='private')
        account = Account(user_id=other.id, name='Banco', type='CHECKING', color='#111111', custom_icon_url=PNG)
        db.add_all([old_icon, private, account])
        db.commit()
        owner_id, other_id, old_id, private_id, account_id = owner.id, other.id, old_icon.id, private.id, account.id
    migrate_shared_icons(legacy_engine)
    migrate_shared_icons(legacy_engine)
    with Session(legacy_engine) as db:
        assert db.query(SharedIcon).count() == 1
        assert db.get(SharedIcon, old_id).image_data == PNG
        assert db.get(CustomIcon, old_id) is None
        assert db.get(CustomIcon, private_id).user_id == other_id
        assert db.get(Account, account_id).custom_icon_url == PNG
        new_private = CustomIcon(user_id=owner_id, image_data='new-private')
        db.add(new_private)
        db.commit()
        new_id = new_private.id
    migrate_shared_icons(legacy_engine)
    with Session(legacy_engine) as db:
        assert db.get(CustomIcon, new_id) is not None
        db.delete(db.get(User, owner_id))
        db.commit()
        assert db.get(SharedIcon, old_id) is not None
        db.delete(db.get(SharedIcon, old_id))
        db.commit()
    migrate_shared_icons(legacy_engine)
    with Session(legacy_engine) as db:
        assert db.query(SharedIcon).count() == 0
        assert db.get(CustomIcon, private_id) is not None


def test_empty_database_never_promotes_later_user_uploads(legacy_engine):
    migrate_shared_icons(legacy_engine)
    with Session(legacy_engine) as db:
        user = User(full_name='Primeiro', email='first@test.com', password_hash='unused')
        db.add(user)
        db.flush()
        db.add(CustomIcon(user_id=user.id, image_data=PNG))
        db.commit()
    migrate_shared_icons(legacy_engine)
    with Session(legacy_engine) as db:
        assert db.query(SharedIcon).count() == 0
        assert db.query(CustomIcon).count() == 1

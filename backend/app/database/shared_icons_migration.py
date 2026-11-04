from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.models import CustomIcon, DataMigration, SharedIcon, User


MIGRATION_NAME = "shared_icons_owned_by_portal_v1"


def migrate_shared_icons(engine):
    """Transfer the old shared library once, preserving IDs and image data.

    New databases are marked too: later uploads by the oldest user must never
    become public. The marker and transfer commit together, including on restart.
    """
    marker = DataMigration.__table__
    private = CustomIcon.__table__
    shared = SharedIcon.__table__
    try:
        with engine.begin() as conn:
            if conn.execute(select(marker.c.name).where(marker.c.name == MIGRATION_NAME)).first():
                return
            conn.execute(marker.insert().values(name=MIGRATION_NAME))
            main_user_id = conn.execute(select(User.id).order_by(User.created_at, User.id).limit(1)).scalar()
            if main_user_id is None:
                return
            icons = conn.execute(select(private).where(private.c.user_id == main_user_id)).mappings().all()
            for icon in icons:
                conn.execute(shared.insert().values(
                    id=icon["id"], image_data=icon["image_data"], created_at=icon["created_at"],
                ))
            conn.execute(private.delete().where(private.c.user_id == main_user_id))
    except IntegrityError:
        # A concurrent startup may have completed the same migration first.
        with engine.connect() as conn:
            if conn.execute(select(marker.c.name).where(marker.c.name == MIGRATION_NAME)).first():
                return
        raise

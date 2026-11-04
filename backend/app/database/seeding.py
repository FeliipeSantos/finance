import json
from pathlib import Path

from sqlalchemy.orm import Session
from app.models.models import Category

DEFAULT_CATEGORIES = json.loads(Path(__file__).with_name("default_categories.json").read_text(encoding="utf-8"))


def seed_user_categories(db: Session, user_id, *, commit: bool = True):
    def create_category(values):
        category = Category(**values)
        db.add(category)
        db.flush()
        return category

    order_by_type = {}
    for cat in DEFAULT_CATEGORIES:
        order_by_type[cat["type"]] = order_by_type.get(cat["type"], -1) + 1
        parent = create_category({
            "user_id": user_id,
            "name": cat["name"],
            "type": cat["type"],
            "color": cat["color"],
            "icon": cat["icon"],
            "display_order": order_by_type[cat["type"]],
            "show_in_accounts_by_category": True,
            "show_in_category_summary": True,
            "show_in_category_balance": True
        })

        for sub_index, sub in enumerate(cat["subcategories"]):
            create_category({
                "user_id": user_id,
                "name": sub["name"],
                "type": cat["type"],
                "color": sub.get("color") or cat["color"],
                "icon": sub.get("icon") or cat["icon"],
                "display_order": sub_index,
                "parent_category_id": parent.id,
                "show_in_accounts_by_category": True,
                "show_in_category_summary": True,
                "show_in_category_balance": True
            })
    if commit:
        db.commit()

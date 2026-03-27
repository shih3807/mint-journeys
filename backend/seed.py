from models.table_models import (
    Category,
    Currency,
)
from database import SessionLocal
from sqlalchemy import select


def insert_test_data():
    db = SessionLocal()
    try:
        # 類別
        default_category_data = [
            {"name": "餐飲"},
            {"name": "住宿"},
            {"name": "交通"},
            {"name": "購物"},
            {"name": "娛樂"},
            {"name": "景點門票"},
            {"name": "簽證保險"},
            {"name": "其他"},
        ]

        for data in default_category_data:
            exists = db.execute(select(Category).where(Category.name == data["name"]))
            if not exists:
                db.add(Category(**data))

            # 貨幣
        default_currency_data = [
            {"code": "TWD", "name": "新台幣"},
            {"code": "USD", "name": "美元"},
            {"code": "EUR", "name": "歐元"},
            {"code": "JPY", "name": "日圓"},
            {"code": "GBP", "name": "英鎊"},
            {"code": "KRW", "name": "韓元"},
            {"code": "HKD", "name": "港幣"},
            {"code": "CNY", "name": "人民幣"},
            {"code": "SGD", "name": "新加坡幣"},
            {"code": "AUD", "name": "澳幣"},
            {"code": "CAD", "name": "加拿大幣"},
            {"code": "CHF", "name": "瑞士法郎"},
            {"code": "THB", "name": "泰銖"},
            {"code": "MYR", "name": "馬來西亞令吉"},
            {"code": "VND", "name": "越南盾"},
            {"code": "NZD", "name": "紐西蘭幣"},
        ]
        for data in default_currency_data:
            exists = db.execute(select(Currency).where(Currency.code == data["code"]))
            if not exists:
                db.add(Currency(**data))

    except Exception as e:
        db.rollback()
        print(e)

    finally:
        db.commit()
        db.close()

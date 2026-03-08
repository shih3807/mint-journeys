from models.table_models import (
    User,
    Trip,
    TripMember,
    Category,
    Currency,
    Transaction,
    ExchangeRate,
)
from database import SessionLocal

def insert_test_data():
    db = SessionLocal()
    try:

            
        # 類別
        default_category_data = [
            {"is_default": True, "name": "餐飲"},
            {"is_default": True, "name": "住宿"},
            {"is_default": True, "name": "交通"},
            {"is_default": True, "name": "購物"},
            {"is_default": True, "name": "娛樂"},
            {"is_default": True, "name": "景點門票"},
            {"is_default": True, "name": "其他"},
        ]

        for data in default_category_data:
            exists = db.query(Category).filter_by(name=data["name"]).first()
            if not exists:
                db.add(Category(**data))


        # 貨幣
        default_currency_data = [
            {"code": "USD", "name": "美元"},
            {"code": "JPY", "name": "日圓"},
            {"code": "TWD", "name": "新台幣"},
        ]

        for data in default_currency_data:
            exists = db.query(Currency).filter_by(code=data["code"]).first()
            if not exists:
                db.add(Currency(**data))

    except Exception as e:
        db.rollback()
        print(e)

    finally:
        db.commit()
        db.close()

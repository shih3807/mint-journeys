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
            {"code": "TWD", "name": "新台幣", "symbol": "NT$"},
            {"code": "USD", "name": "美元", "symbol": "$"},
            {"code": "EUR", "name": "歐元", "symbol": "€"},
            {"code": "JPY", "name": "日圓", "symbol": "¥"},
            {"code": "GBP", "name": "英鎊", "symbol": "£"},
            {"code": "KRW", "name": "韓元", "symbol": "₩"},
            {"code": "HKD", "name": "港幣", "symbol": "HK$"},
            {"code": "CNY", "name": "人民幣", "symbol": "¥"},
            {"code": "SGD", "name": "新加坡幣", "symbol": "S$"},
            {"code": "AUD", "name": "澳幣", "symbol": "A$"},
            {"code": "CAD", "name": "加拿大幣", "symbol": "C$"},
            {"code": "CHF", "name": "瑞士法郎", "symbol": "CHF"},
            {"code": "THB", "name": "泰銖", "symbol": "฿"},
            {"code": "MYR", "name": "馬來西亞令吉", "symbol": "RM"},
            {"code": "VND", "name": "越南盾", "symbol": "₫"},
            {"code": "NZD", "name": "紐西蘭幣", "symbol": "NZ$"},
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

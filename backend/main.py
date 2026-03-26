from fastapi import FastAPI, Depends, Request, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, get_db
from sqlalchemy.orm import Session
from typing import List, Any
from pydantic import EmailStr
from backend.models.image_service import ImageService
from models.table_models import (
    User,
    Trip,
    TripMember,
    Category,
    Currency,
    Transaction,
    ExchangeRate,
)
from seed import insert_test_data
from models.schemas import (
    SingupRequest,
    LoginRequest,
    CreateTripRequest,
    TransactionCreate,
)
import bcrypt
import jwt
import datetime
import os

from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://mintjourneys.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.drop_all(bind=engine)  # TODO:樣式確定後刪除
Base.metadata.create_all(bind=engine)  # 建置資料表
insert_test_data()  # 預設資料


BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR.parent / "frontend" / "static"
TEMPLATE_DIR = BASE_DIR.parent / "frontend" / "templates"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# 回覆檔案
@app.get("/", include_in_schema=False)
async def index(request: Request):
    return FileResponse(TEMPLATE_DIR / "index.html", media_type="text/html")


@app.get("/auth", include_in_schema=False)
async def auth_page(request: Request):
    return FileResponse(TEMPLATE_DIR / "auth.html", media_type="text/html")


@app.get("/home", include_in_schema=False)
async def home(request: Request):
    return FileResponse(TEMPLATE_DIR / "home.html", media_type="text/html")


@app.get("/trip/new", include_in_schema=False)
async def new_trip_page(request: Request):
    return FileResponse(TEMPLATE_DIR / "new-trip.html", media_type="text/html")


@app.get("/trip/{id}/new", include_in_schema=False)
async def new_transaction_page(
    request: Request,
    id: int,
    currency_id: int | None = None,
):
    return FileResponse(TEMPLATE_DIR / "new_transaction.html", media_type="text/html")


@app.get("/trip/{id}", include_in_schema=False)
async def trip_page(
    request: Request,
    id: int,
    currency_id: int | None = None,
):
    return FileResponse(TEMPLATE_DIR / "trip.html", media_type="text/html")


# 會員系統


@app.post("/api/auth/register")
def register_user(request: Request, data: SingupRequest, db: Session = Depends(get_db)):
    try:
        name = data.name
        email = data.email.lower()
        password = data.password

        # 確認信箱是否重複
        email_exists = db.query(User.email).filter(User.email == email).first()
        if email_exists:
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "註冊失敗，重複的電子信箱"},
            )

        # 雜湊密碼
        hash_password = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        user = User(email=email, hash_password=hash_password, name=name)

        db.add(user)
        db.flush()

        # 生成會員頭貼
        avator = ImageService.generate_avatar(name)
        if avator:
            image_name = ImageService.avatar_image_name(user.id)
            saved = ImageService.save_image(image_name, avator)

            if not saved:
                return JSONResponse(
                    status_code=500,
                    content={"error": True, "message": "伺服器發生錯誤，存取失敗"},
                )

            user.avatar_filename = saved

        db.commit()
        db.refresh(user)

        return JSONResponse(status_code=200, content={"ok": True})
    except Exception as e:
        print(e)
        raise


@app.post("/api/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        email = data.email.lower()
        password = data.password

        user = db.query(User).filter(User.email == email).first()

        # 以電子信箱檢查使用者是否存在
        if not user:
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "登入失敗，錯誤的電子信箱"},
            )

        # 驗證密碼
        correct_password = bcrypt.checkpw(
            password.encode("utf-8"), user.hash_password.encode("utf-8")
        )

        if not correct_password:
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "登入失敗，錯誤的密碼"},
            )

        # 製作 Token
        payload = {
            "id": user.id,
            "name": user.name,
            "exp": datetime.datetime.now(datetime.timezone.utc)
            + datetime.timedelta(days=30),
        }
        secret = os.environ.get("TOKEN_SECRET")

        token = jwt.encode(payload, secret, algorithm="HS256")

        return JSONResponse(status_code=200, content={"ok": True, "token": token})
    except Exception as e:
        print(e)
        raise


# 旅程系統
@app.post("/api/trips")
def create_trip(
    request: Request, data: CreateTripRequest, db: Session = Depends(get_db)
):
    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 取得user_id
        secret = os.environ.get("TOKEN_SECRET")
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, secret, algorithms="HS256")
        user_id = payload["id"]
        if not user_id:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 先檢查 member email
        def ckeck_member_exists(member_email):
            if member_email:
                member_user_id = (
                    db.query(User.id).filter(User.email == member_email).scalar()
                )

                if member_user_id:
                    return member_user_id
                return False

        # 建立 trip
        trip = Trip(
            name=data.name,
            base_currency=data.base_currency,
            budget=data.budget,
            start_date=data.start_date,
            end_date=data.end_date,
            created_by=user_id,
        )

        db.add(trip)
        db.flush()

        # creator 加入 member
        creator_member = TripMember(trip_id=trip.id, user_id=user_id)
        db.add(creator_member)

        # 如果有共同編輯者
        if data.member_email:
            member_id = ckeck_member_exists(data.member_email)

            if not member_id:
                return JSONResponse(
                    status_code=401,
                    content={"error": True, "message": "共同編輯者不存在"},
                )

            member = TripMember(trip_id=trip.id, user_id=member_id)
            db.add(member)

        # 一起 commit
        db.commit()

        return JSONResponse(
            status_code=200,
            content={"ok": True, "message": "成功建立新行程！"},
        )

    except Exception as e:
        db.rollback()
        print(e)
        raise


@app.get("/api/trips")
def get_trips(request: Request, db: Session = Depends(get_db)):

    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 取得user_id
        secret = os.environ.get("TOKEN_SECRET")
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, secret, algorithms="HS256")
        user_id = payload["id"]
        if not user_id:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 取得旅程資料
        creator_trips = (
            db.query(
                Trip.id,
                Trip.name,
                Trip.start_date,
                Trip.end_date,
                Trip.base_currency,
                Currency.id.label("currency_id"),
            )
            .join(Currency, Trip.base_currency == Currency.code, isouter=True)
            .filter(Trip.created_by == user_id)
            .all()
        )

        member_trips = (
            db.query(
                Trip.id,
                Trip.name,
                Trip.start_date,
                Trip.end_date,
                Trip.base_currency,
                Currency.id.label("currency_id"),
            )
            .join(Currency, Trip.base_currency == Currency.code, isouter=True)
            .join(TripMember)
            .filter(TripMember.user_id == user_id, Trip.created_by != user_id)
            .all()
        )

        creator_result = [
            {
                "id": id,
                "name": name,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "currency": currency,
                "currency_id": currency_id,
            }
            for id, name, start_date, end_date, currency, currency_id in creator_trips
        ]

        member_result = [
            {
                "id": id,
                "name": name,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "currency": currency,
                "currency_id": currency_id,
            }
            for id, name, start_date, end_date, currency, currency_id in member_trips
        ]

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "data": {"trips": creator_result, "shareTrips": member_result},
            },
        )
    except Exception as e:
        print(e)
        raise


@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: int, db: Session = Depends(get_db)):

    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if not trip:
        return JSONResponse(
            status_code=404,
            content={"error": True, "message": "Trip not found"},
        )

    transactions = (
        db.query(
            Transaction,
            Category.name.label("category_name"),
            User.name.label("user_name"),
        )
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .join(User, Transaction.user_id == User.id)
        .filter(Transaction.trip_id == trip_id)
        .order_by(Transaction.transaction_date.desc())
        .all()
    )
    return {
        "trip": {
            "id": trip.id,
            "name": trip.name,
            "base_currency": trip.base_currency,
            "budget": trip.budget,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "created_by": trip.created_by,
        },
        "transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "currency": t.currency,
                "description": t.description,
                "transaction_date": t.transaction_date,
                "category": category_name,
                "user": user_name,
            }
            for t, category_name, user_name in transactions
        ],
    }


# @app.delete("/api/trips/{trip_id}")
# def delete_trip(trip_id: UUID, db: Session = Depends(get_db)):

#     trip = (
#         db.query(models.table_models.Trip)
#         .filter(models.table_models.Trip.trip_id == trip_id)
#         .first()
#     )

#     if not trip:
#         raise HTTPException(status_code=404, detail="Trip not found")

#     db.delete(trip)
#     db.commit()

#     return {"message": "trip deleted"}


# 旅程圖片
@app.post("/trips/{trip_id}/image")
def upload_trip_image(
    request: Request,
    trip_id: int,
    file: UploadFile = Form(...),
    db: Session = Depends(get_db),
):
    # 驗證是否登入
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return JSONResponse(
            status_code=403,
            content={"error": True, "message": "未登入系統，拒絕存取"},
        )

    # 取得user_id
    secret = os.environ.get("TOKEN_SECRET")
    token = auth_header.split(" ")[1]
    payload = jwt.decode(token, secret, algorithms="HS256")
    user_id = int(payload["id"])
    if not user_id:
        return JSONResponse(
            status_code=403,
            content={"error": True, "message": "未登入系統，拒絕存取"},
        )

    filename = ImageService.trip_image_name(trip_id, user_id)

    webp = ImageService.convert_to_webp(file.file)

    saved = ImageService.save_image(filename, webp)

    if not saved:
        return JSONResponse(
            status_code=500,
            content={"error": True, "message": "伺服器發生錯誤，存取失敗"},
        )

    trip = db.get(Trip, trip_id)
    if not trip:
        return JSONResponse(
            status_code=404,
            content={"error": True, "message": "旅程不存在，存取失敗"},
        )

    trip.image_filename = filename

    db.commit()

    return {"ok": True}


@app.delete("/trips/{trip_id}/image")
def delete_trip_image(trip_id: int, db: Session = Depends(get_db)):

    trip = db.get(Trip, trip_id)
    if not trip:
        return JSONResponse(
            status_code=404,
            content={"error": True, "message": "旅程不存在，無法刪除"},
        )

    if not trip.image_filename:
        return {"ok": True}

    ImageService.delete_image(trip.image_filename)

    trip.image_filename = None

    db.commit()

    return {"ok": True}


# 預設分類
@app.get("/categories/", response_model=List[dict])
async def get_categories(db: Session = Depends(get_db)):
    try:
        categories = db.query(Category).all()
        categories_result = [
            {
                "category_id": c.id,
                "category_name": c.name,
            }
            for c in categories
        ]

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "data": categories_result,
            },
        )
    except Exception as e:
        print(e)
        raise


# 取得貨幣
@app.get("/currencies/", response_model=List[dict])
async def get_currencies(db: Session = Depends(get_db)):
    try:
        currencies = db.query(Currency).all()
        currencies_result = [
            {
                "currency_id": c.id,
                "currency_name": c.name,
                "currency_code": c.code,
                "currency_symbol": c.symbol,
            }
            for c in currencies
        ]

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "data": currencies_result,
            },
        )
    except Exception as e:
        print(e)
        raise


# 消費紀錄
@app.post("/api/transactions")
def create_transaction(
    request: Request,
    data: TransactionCreate,
    db: Session = Depends(get_db),
):
    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 取得user_id
        secret = os.environ.get("TOKEN_SECRET")
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, secret, algorithms="HS256")
        user_id = payload["id"]
        if not user_id:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        currency = db.query(Currency).filter(Currency.id == data.currency_id).first()
        if not currency:
            return JSONResponse(
                status_code=400, content={"error": True, "message": "貨幣不存在"}
            )

        transaction = Transaction(
            trip_id=data.trip_id,
            user_id=user_id,
            category_id=data.category_id,
            amount=data.amount,
            currency=currency.code,
            description=data.description,
            transaction_date=data.transaction_date,
        )

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        return JSONResponse(
            status_code=200,
            content={"ok": True, "message": "消費紀錄儲存成功！"},
        )
    except Exception as e:
        print(e)
        raise


# @app.get("/api/transaction")
# def get_expenses(trip_id: UUID, db: Session = Depends(get_db)):

#     expenses = (
#         db.query(models.table_models.Expense)
#         .filter(models.table_models.Expense.trip_id == trip_id)
#         .all()
#     )

#     return expenses


# @app.delete("/api/transaction/{transaction_id}")
# def delete_expense(expense_id: UUID, db: Session = Depends(get_db)):

#     expense = (
#         db.query(models.table_models.Expense)
#         .filter(models.table_models.Expense.expense_id == expense_id)
#         .first()
#     )

#     if not expense:
#         raise HTTPException(status_code=404, detail="Expense not found")

#     db.delete(expense)
#     db.commit()

#     return {"message": "expense deleted"}


# 消費紀錄圖片
@app.post("/transactions/{transaction_id}/image")
def upload_transaction_image(
    request: Request,
    transaction_id: int,
    file: UploadFile = Form(...),
    db: Session = Depends(get_db),
):

    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 取得user_id
        secret = os.environ.get("TOKEN_SECRET")
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, secret, algorithms="HS256")
        user_id = payload["id"]
        if not user_id:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        transaction = db.get(Transaction, transaction_id)

        if transaction is None:
            return JSONResponse(
                status_code=400, content={"error": True, "message": "該交易不存在"}
            )

        filename = ImageService.transaction_image_name(
            transaction.trip_id,
            user_id,
        )

        webp = ImageService.convert_to_webp(file.file)

        saved = ImageService.save_image(filename, webp)

        if not saved:
            return JSONResponse(
                status_code=500,
                content={"error": True, "message": "伺服器發生錯誤，存取失敗"},
            )

        transaction.image_filename = filename

        db.commit()

        return {"ok": True}
    except Exception as e:
        print(e)
        raise

@app.delete("/transactions/{transaction_id}/image")
def delete_transaction_image(
    request: Request,
    transaction_id: int,
    db: Session = Depends(get_db),
):

    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 取得user_id
        secret = os.environ.get("TOKEN_SECRET")
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, secret, algorithms="HS256")
        user_id = payload["id"]
        if not user_id:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        transaction = db.get(Transaction, id)

        if transaction is None:
            return JSONResponse(
                status_code=400, content={"error": True, "message": "該交易不存在"}
            )

        if not transaction.image_filename:
            return {"ok": True}

        ImageService.delete_image(
            transaction.image_filename
        )

        transaction.image_filename = None

        db.commit()

        return {"ok": True}
    except Exception as e:
        print(e)
        raise

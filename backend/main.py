from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from database import Base, engine, get_db
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import EmailStr
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
from models.schemas import SingupRequest, LoginRequest
import bcrypt
import jwt
import datetime
import os

from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI()
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


# 會員系統


@app.post("/api/auth/register")
def register_user(request: Request, data: SingupRequest, db: Session = Depends(get_db)):
    try:
        name = data.name
        email = data.email.lower()
        password = data.password

        email_exists = db.query(User.email).filter(User.email == email).first()
        if email_exists:
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "註冊失敗，重複的電子信箱"},
            )

        hash_password = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        user = User(email=email, hash_password=hash_password, name=name)

        db.add(user)
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


# 製作旅程

# @app.post("/api/trips")
# def create_trip(title: str, user_id: UUID, db: Session = Depends(get_db)):

#     trip = models.table_models.Trip(title=title, user_id=user_id)

#     db.add(trip)
#     db.commit()
#     db.refresh(trip)

#     return trip


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
        


    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": True, "message": "訂單建立失敗"},
        )


# @app.get("/api/trips/{trip_id}")
# def get_trip(trip_id: UUID, db: Session = Depends(get_db)):

#     trip = (
#         db.query(models.table_models.Trip)
#         .filter(models.table_models.Trip.trip_id == trip_id)
#         .first()
#     )

#     if not trip:
#         raise HTTPException(status_code=404, detail="Trip not found")

#     return trip


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


# # ---------------------
# # Expense System
# # ---------------------


# @app.post("/api/expenses")
# def create_expense(
#     trip_id: UUID,
#     amount: int,
#     currency: str,
#     category: str,
#     note: str,
#     db: Session = Depends(get_db),
# ):

#     expense = models.table_models.Expense(
#         trip_id=trip_id, amount=amount, currency=currency, category=category, note=note
#     )

#     db.add(expense)
#     db.commit()
#     db.refresh(expense)

#     return expense


# @app.get("/api/expenses")
# def get_expenses(trip_id: UUID, db: Session = Depends(get_db)):

#     expenses = (
#         db.query(models.table_models.Expense)
#         .filter(models.table_models.Expense.trip_id == trip_id)
#         .all()
#     )

#     return expenses


# @app.delete("/api/expenses/{expense_id}")
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

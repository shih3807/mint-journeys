from fastapi import (
    FastAPI,
    Depends,
    Request,
    UploadFile,
    Form,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, get_db
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, delete, func, and_
from typing import List
from datetime import date, datetime
from models.image_service import ImageService
from models.connection_manager import ConnectionManager
from models.table_models import (
    User,
    Trip,
    TripMember,
    Category,
    Currency,
    Transaction,
    Notification,
)
from seed import insert_test_data
from models.schemas import (
    SingupRequest,
    LoginRequest,
    CreateTripRequest,
    AddMemberRequest,
    UpdateTripRequest,
    TransactionCreate,
    UserExists,
)
import bcrypt
import jwt
import datetime
import os
import asyncio

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


# websocket連線
connection_manager = ConnectionManager()


@app.websocket("/ws/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: str):
    await connection_manager.connect(websocket, trip_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, trip_id)


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
def register_user(data: SingupRequest, db: Session = Depends(get_db)):
    try:
        name = data.name
        email = data.email.lower()
        password = data.password

        # 確認信箱是否重複
        email_exists = db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()

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

            if saved:
                user.avatar_filename = saved

        db.commit()
        db.refresh(user)

        return JSONResponse(status_code=200, content={"ok": True})
    except Exception as e:
        print(e)
        raise


@app.post("/api/auth/login")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        email = data.email.lower()
        password = data.password

        user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

        # 以電子信箱檢查使用者是否存在
        if not user:
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "登入失敗，錯誤或未註冊的電子信箱"},
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


@app.post("/api/user/exists")
def email_exists(request: Request, data: UserExists, db: Session = Depends(get_db)):
    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 查詢Email是否存在
        email_exists = db.execute(
            select(User).where(User.email == data.email)
        ).scalar_one_or_none()

        if email_exists:
            return JSONResponse(
                status_code=200,
                content={"ok": True, "message": "該用戶存在"},
            )

        return JSONResponse(
            status_code=404,
            content={"error": True, "message": "該用戶不存在"},
        )

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

        # 建立 trip
        trip = Trip(
            name=data.name,
            base_currency_id=data.base_currency_id,
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

        # 檢查 member email
        def check_member_exists(member_email):
            if member_email:
                member_exists = db.execute(
                    select(User).where(User.email == member_email)
                ).scalar_one_or_none()

                if member_exists:
                    return member_exists.id
                return False

        # 如果有共同編輯者
        if data.member_emails:
            # 針對每一個共同編輯者做處理
            for email in data.member_emails:
                member_id = check_member_exists(email)

                if not member_id:
                    return JSONResponse(
                        status_code=401,
                        content={
                            "error": True,
                            "message": f"新增行程失敗，{email} 不存在",
                        },
                    )

                member = TripMember(trip_id=trip.id, user_id=member_id)
                db.add(member)

                # 新增通知
                db.add(
                    Notification(
                        user_id=member_id,
                        message=f"{payload['name']} 將你加入行程：{trip.name}",
                    )
                )

        # 一起 commit
        db.commit()

        return JSONResponse(
            status_code=200,
            content={"ok": True, "message": "成功建立新行程！", "trip_id": trip.id},
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
        stmt = (
            select(Trip)
            .options(selectinload(Trip.currency))
            .options(selectinload(Trip.members).selectinload(TripMember.user))
            .join(Trip.members)
            .where(TripMember.user_id == user_id)
        )
        all_trips = db.execute(stmt).scalars().all()

        # 分類行程
        my_trips = []
        shared_trips = []

        for trip in all_trips:
            if len(trip.members) == 1:
                my_trips.append(trip)
            else:
                shared_trips.append(trip)

        def my_trip(trip: Trip):
            return {
                "id": trip.id,
                "name": trip.name,
                "start_date": trip.start_date.isoformat() if trip.start_date else None,
                "end_date": trip.end_date.isoformat() if trip.end_date else None,
                "currency": trip.currency.code if trip.currency else None,
                "currency_id": trip.currency.id if trip.currency else None,
                "budget": trip.budget,
                "image_filename": ImageService.file_url(trip.image_filename)
                if (trip.image_filename)
                else None,
                "image_version": trip.image_version.isoformat()
                if trip.image_version
                else None,
            }

        def shared_trip(trip: Trip):
            return {
                "id": trip.id,
                "name": trip.name,
                "start_date": trip.start_date.isoformat() if trip.start_date else None,
                "end_date": trip.end_date.isoformat() if trip.end_date else None,
                "currency": trip.currency.code if trip.currency else None,
                "currency_id": trip.currency.id if trip.currency else None,
                "budget": trip.budget,
                "image_filename": ImageService.file_url(trip.image_filename)
                if (trip.image_filename)
                else None,
                "image_version": trip.image_version.isoformat()
                if trip.image_version
                else None,
                "members": [
                    {
                        "user_id": m.user.id,
                        "name": m.user.name,
                        "avatar": ImageService.file_url(m.user.avatar_filename)
                        if m.user.avatar_filename
                        else None,
                    }
                    for m in trip.members
                ],
            }

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "data": {
                    "trips": [my_trip(trip) for trip in my_trips],
                    "shareTrips": [shared_trip(trip) for trip in shared_trips],
                },
            },
        )

    except Exception as e:
        print(e)
        raise


@app.get("/api/trips/{trip_id}")
def get_trip(request: Request, trip_id: int, db: Session = Depends(get_db)):

    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        trip = db.get(Trip, trip_id)

        if not trip:
            return JSONResponse(
                status_code=404,
                content={"error": True, "message": "旅程不存在"},
            )

        stmt = (
            select(Transaction)
            .options(
                selectinload(Transaction.category),
                selectinload(Transaction.user),
                selectinload(Transaction.currency),
            )
            .where(Transaction.trip_id == trip_id)
            .order_by(Transaction.transaction_date.desc())
        )

        transactions = db.execute(stmt).scalars().all()

        # 共享行程加成員資料
        if len(trip.members) == 1:
            trip_data = {
                "id": trip.id,
                "name": trip.name,
                "base_currency_id": trip.currency.id if trip.currency else None,
                "base_currency": trip.currency.code if trip.currency else None,
                "image_filename": ImageService.file_url(trip.image_filename)
                if (trip.image_filename)
                else None,
                "image_version": trip.image_version.isoformat()
                if trip.image_version
                else None,
                "budget": trip.budget,
                "start_date": trip.start_date.isoformat() if trip.start_date else None,
                "end_date": trip.end_date.isoformat() if trip.end_date else None,
                "created_by": trip.created_by,
            }

        else:
            trip_data = {
                "id": trip.id,
                "name": trip.name,
                "base_currency_id": trip.currency.id if trip.currency else None,
                "base_currency": trip.currency.code if trip.currency else None,
                "image_filename": ImageService.file_url(trip.image_filename)
                if (trip.image_filename)
                else None,
                "image_version": trip.image_version.isoformat()
                if trip.image_version
                else None,
                "budget": trip.budget,
                "start_date": trip.start_date.isoformat() if trip.start_date else None,
                "end_date": trip.end_date.isoformat() if trip.end_date else None,
                "created_by": trip.created_by,
                "members": [
                    {
                        "user_id": m.user.id,
                        "name": m.user.name,
                        "avatar": ImageService.file_url(m.user.avatar_filename)
                        if m.user.avatar_filename
                        else None,
                    }
                    for m in trip.members
                ],
            }

        transactions_data = [
            {
                "id": t.id,
                "name": t.name,
                "amount": t.amount,
                "currency": t.currency.code,
                "description": t.description,
                "transaction_date": t.transaction_date.isoformat()
                if t.transaction_date
                else None,
                "category": t.category.name,
                "user": t.user.name,
            }
            for t in transactions
        ]

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "data": {
                    "trip": trip_data,
                    "transactions": transactions_data,
                },
            },
        )

    except Exception as e:
        print(e)
        raise


@app.patch("/api/trips/{trip_id}")
def update_trip(
    trip_id: int,
    request: Request,
    data: UpdateTripRequest,
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

        #  從資料庫取得旅程
        trip = db.get(Trip, trip_id)

        if not trip:
            return JSONResponse(
                status_code=404,
                content={"error": True, "message": "旅程不存在，無法修改"},
            )

        # 檢查權限
        stmt = (
            select(TripMember)
            .where(TripMember.trip_id == trip_id)
            .where(TripMember.user_id == user_id)
        )
        is_member = db.execute(stmt).scalar_one_or_none()

        if not is_member:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "非旅程成員，拒絕存取"},
            )

        # 更新欄位

        if data.name:
            trip.name = data.name

        if data.base_currency_id is not None:
            trip.base_currency_id = data.base_currency_id

        if data.budget is not None:
            trip.budget = data.budget

        if data.start_date:
            trip.start_date = data.start_date

        if data.end_date:
            trip.end_date = data.end_date

        db.commit()

        return JSONResponse(
            status_code=200,
            content={"ok": True, "message": "更新成功！"},
        )

    except Exception as e:
        db.rollback()
        print(e)
        raise


@app.post("/api/trips/{trip_id}/members")
def add_member(
    request: Request,
    trip_id: int,
    data: AddMemberRequest,
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

        # 取得user_name
        secret = os.environ.get("TOKEN_SECRET")
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, secret, algorithms="HS256")
        user_name = payload["id"]
        if not user_name:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 檢查 trip 是否存在
        trip = db.get(Trip, trip_id)
        if not trip:
            return JSONResponse(
                status_code=404,
                content={"error": True, "message": "不存在的旅程，存取失敗"},
            )

        # 檢查 member email
        def check_member_exists(member_email):
            if member_email:
                member_exists = db.execute(
                    select(User).where(User.email == member_email)
                ).scalar_one_or_none()

                if member_exists:
                    return member_exists.id
                return False

        # 如果有共同編輯者
        if data.member_emails:
            # 針對每一個共同編輯者做處理
            for email in data.member_emails:
                member_id = check_member_exists(email)

                if not member_id:
                    return JSONResponse(
                        status_code=401,
                        content={
                            "error": True,
                            "message": f"新增行程失敗，{email} 不存在",
                        },
                    )

                # 檢查是否已加入
                stmt = select(TripMember).where(
                    TripMember.trip_id == trip_id,
                    TripMember.user_id == member_id,
                )

                already_exist = db.execute(stmt).scalar_one_or_none()

                if already_exist:
                    continue

                member = TripMember(trip_id=trip.id, user_id=member_id)
                db.add(member)

                # 新增通知
                db.add(
                    Notification(
                        user_id=member_id,
                        message=f"{user_name} 將你加入行程：{trip.name}",
                    )
                )

        # 一起 commit
        db.commit()

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "message": "成功新增成員！",
            },
        )

    except Exception as e:
        db.rollback()
        print(e)
        raise


@app.delete("/api/trips/{trip_id}")
def remove_member(
    request: Request,
    trip_id: int,
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

        # 確定旅程是否存在
        trip = db.get(Trip, trip_id)
        if not trip:
            return JSONResponse(
                status_code=404,
                content={"error": True, "message": "不存在的旅程，存取失敗"},
            )

        # 確定成員是否在行程中
        stmt = select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == user_id,
        )

        member = db.execute(stmt).scalar_one_or_none()

        if not member:
            return JSONResponse(
                status_code=200,
                content={"ok": True, "message": "成功退出行程！"},
            )

        # 刪除 member
        db.delete(member)
        db.flush()

        # 檢查還剩幾個人，刪除沒有成員的行程
        stmt = select(TripMember).where(TripMember.trip_id == trip_id)

        members = db.execute(stmt).scalars().all()

        if len(members) == 0:
            # 刪旅程圖片
            if trip.image_filename:
                delete_trip_image = ImageService.delete_image(trip.image_filename)

                if not delete_trip_image:
                    return JSONResponse(
                        status_code=500,
                        content={"error": True, "message": "退出行程失敗，請稍後再試"},
                    )

            # 刪交易圖片
            stmt = select(Transaction).where(Transaction.trip_id == trip_id)

            transactions = db.execute(stmt).scalars().all()

            for t in transactions:
                if t.image_filename:
                    delete_transactions_image = ImageService.delete_image(
                        t.image_filename
                    )
                    if not delete_transactions_image:
                        return JSONResponse(
                            status_code=500,
                            content={
                                "error": True,
                                "message": "退出行程失敗，請稍後再試",
                            },
                        )

            # 刪 trip
            db.delete(trip)

        db.commit()

        return JSONResponse(
            status_code=200,
            content={"ok": True, "message": "成功退出行程！"},
        )

    except Exception as e:
        db.rollback()
        print(e)
        raise


# 旅程圖片
@app.post("/api/trips/{trip_id}/image")
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
    trip.image_version = datetime.datetime.now()

    db.commit()

    return JSONResponse(
        status_code=200,
        content={"ok": True, "message": "成功新增圖片！"},
    )


@app.delete("/api/trips/{trip_id}/image")
def delete_trip_image(request: Request, trip_id: int, db: Session = Depends(get_db)):

    # 驗證是否登入
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return JSONResponse(
            status_code=403,
            content={"error": True, "message": "未登入系統，拒絕存取"},
        )

    trip = db.get(Trip, trip_id)
    if not trip:
        return JSONResponse(
            status_code=404,
            content={"error": True, "message": "旅程不存在，無法刪除"},
        )

    if not trip.image_filename:
        return JSONResponse(
            status_code=200,
            content={"ok": True, "message": "成功刪除圖片！"},
        )

    ImageService.delete_image(trip.image_filename)

    trip.image_filename = None
    trip.image_version = datetime.datetime.now()

    db.commit()

    return JSONResponse(
        status_code=200,
        content={"ok": True, "message": "成功刪除圖片！"},
    )


# 預設分類
@app.get("/api/categories", response_model=List[dict])
async def get_categories(db: Session = Depends(get_db)):
    try:
        categories = db.execute(select(Category)).scalars().all()
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
@app.get("/api/currencies", response_model=List[dict])
async def get_currencies(db: Session = Depends(get_db)):
    try:
        currencies = db.execute(select(Currency)).scalars().all()
        currencies_result = [
            {
                "currency_id": c.id,
                "currency_name": c.name,
                "currency_code": c.code,
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
@app.post("/api/transaction")
async def create_transaction(
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

        # 確認貨幣存在
        stmt = select(Currency).where(Currency.id == data.currency_id)
        currency = db.execute(stmt).scalar_one_or_none()

        if not currency:
            return JSONResponse(
                status_code=404, content={"error": True, "message": "貨幣不存在"}
            )

        # 確認類別存在
        stmt = select(Category).where(Category.id == data.category_id)
        category = db.execute(stmt).scalar_one_or_none()

        if not category:
            return JSONResponse(
                status_code=404, content={"error": True, "message": "類別不存在"}
            )

        transaction = Transaction(
            trip_id=data.trip_id,
            name=data.name,
            user_id=user_id,
            category_id=data.category_id,
            amount=data.amount,
            currency_id=data.currency_id,
            description=data.description,
            transaction_date=data.transaction_date,
        )

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        # 用websocket推播
        asyncio.create_task(
            connection_manager.broadcast_to_trip(
                str(data.trip_id),
                {"message": "新增消費紀錄！"},
            )
        )

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "message": "成功儲存消費紀錄！",
                "transaction_id": transaction.id,
            },
        )
    except Exception as e:
        print(e)
        db.rollback()
        raise


@app.get("/api/transaction/{transaction_id}")
def get_expenses(request: Request, transaction_id: int, db: Session = Depends(get_db)):
    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        # 查詢記帳紀錄
        transaction = db.get(Transaction, transaction_id)

        if not transaction:
            return JSONResponse(
                status_code=404,
                content={"error": True, "message": "記帳紀錄不存在"},
            )

        expenses = {
            "id": transaction.id,
            "name": transaction.name,
            "trip_id": transaction.trip_id,
            "create_by": transaction.user.name,
            "category_id": transaction.category_id,
            "category": transaction.category.name,
            "amount": transaction.amount,
            "currency_id": transaction.currency_id,
            "currency": transaction.currency.code,
            "description": transaction.description,
            "create_at": transaction.transaction_date.isoformat()
            if transaction.transaction_date
            else None,
            "image_filename": ImageService.file_url(transaction.image_filename)
            if (transaction.image_filename)
            else None,
        }

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "data": expenses,
            },
        )

    except Exception as e:
        print(e)
        raise


@app.delete("/api/transaction/{transaction_id}")
def delete_expense(
    request: Request, transaction_id: int, db: Session = Depends(get_db)
):
    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"error": True, "message": "未登入系統，拒絕存取"},
            )

        expense = db.get(Transaction, transaction_id)

        if not expense:
            return JSONResponse(
                status_code=404,
                content={"error": True, "message": "記帳紀錄不存在"},
            )

        db.delete(expense)
        db.commit()

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "message": "成功刪除交易紀錄！",
            },
        )

    except Exception as e:
        print(e)
        db.rollback()
        raise


@app.get("/api/trips/{trip_id}/analytics")
def get_trip_analytics(
    request: Request,
    trip_id: int,
    user: str | None = None,
    category: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    try:
        # 驗證是否登入
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return JSONResponse(
                status_code=403,
                content={"ok": False, "message": "未登入系統，拒絕存取"},
            )

        # 檢查旅程
        trip = db.get(Trip, trip_id)
        if not trip:
            return JSONResponse(
                status_code=404,
                content={"ok": False, "message": "旅程不存在"},
            )

        # 篩選條件
        filters = [Transaction.trip_id == trip_id]

        if user:
            filters.append(User.name == user)

        if category:
            filters.append(Category.name == category)

        if start_date:
            filters.append(Transaction.transaction_date >= start_date)

        if end_date:
            filters.append(Transaction.transaction_date <= end_date)

        summary_stmt = (
            select(
                func.coalesce(func.sum(Transaction.amount), 0).label("total_amount"),
                func.count(Transaction.id).label("total_count"),
                func.coalesce(func.avg(Transaction.amount), 0).label("avg_amount"),
            )
            .select_from(Transaction)
            .outerjoin(Transaction.user)
            .outerjoin(Transaction.category)
            .where(and_(*filters))
        )

        summary_row = db.execute(summary_stmt).one()

        total_amount = float(summary_row.total_amount or 0)
        total_count = int(summary_row.total_count or 0)
        avg_amount = float(summary_row.avg_amount or 0)

        # 依類別分析
        category_stmt = (
            select(
                func.coalesce(Category.name, "未分類").label("category"),
                func.coalesce(func.sum(Transaction.amount), 0).label("amount"),
                func.count(Transaction.id).label("total"),
            )
            .select_from(Transaction)
            .outerjoin(Category, Transaction.category_id == Category.id)
            .outerjoin(User, Transaction.user_id == User.id)
            .where(and_(*filters))
            .group_by(Category.name)
            .order_by(func.sum(Transaction.amount).desc())
        )

        category_rows = db.execute(category_stmt).all()
        category_breakdown = [
            {
                "category": row.category or "未分類",
                "amount": round(float(row.amount or 0), 2),
                "count": int(row.total or 0),
            }
            for row in category_rows
        ]

        # 依使用者分析
        user_stmt = (
            select(
                func.coalesce(User.name, "未知使用者").label("user"),
                func.coalesce(func.sum(Transaction.amount), 0).label("amount"),
                func.count(Transaction.id).label("total"),
            )
            .select_from(Transaction)
            .outerjoin(User, Transaction.user_id == User.id)
            .outerjoin(Category, Transaction.category_id == Category.id)
            .where(and_(*filters))
            .group_by(User.name)
            .order_by(func.sum(Transaction.amount).desc())
        )

        user_rows = db.execute(user_stmt).all()
        user_breakdown = [
            {
                "user": row.user or "未知使用者",
                "amount": round(float(row.amount or 0), 2),
                "count": int(row.total or 0),
            }
            for row in user_rows
        ]

        # 7) 時間趨勢
        timeline_stmt = (
            select(
                func.date(Transaction.transaction_date).label("date"),
                func.coalesce(func.sum(Transaction.amount), 0).label("amount"),
            )
            .select_from(Transaction)
            .outerjoin(User, Transaction.user_id == User.id)
            .outerjoin(Category, Transaction.category_id == Category.id)
            .where(and_(*filters))
            .group_by(func.date(Transaction.transaction_date))
            .order_by(func.date(Transaction.transaction_date).asc())
        )

        timeline_rows = db.execute(timeline_stmt).all()
        timeline = [
            {
                "date": str(row.date),
                "amount": round(float(row.amount or 0), 2),
            }
            for row in timeline_rows
            if row.date is not None
        ]

        # 8) filter 選單
        filter_users_stmt = (
            select(User.name)
            .select_from(Transaction)
            .join(User, Transaction.user_id == User.id)
            .where(Transaction.trip_id == trip_id)
            .group_by(User.name)
            .order_by(User.name.asc())
        )

        filter_categories_stmt = (
            select(Category.name)
            .select_from(Transaction)
            .join(Category, Transaction.category_id == Category.id)
            .where(Transaction.trip_id == trip_id)
            .group_by(Category.name)
            .order_by(Category.name.asc())
        )

        filter_users = [row[0] for row in db.execute(filter_users_stmt).all() if row[0]]
        filter_categories = [
            row[0] for row in db.execute(filter_categories_stmt).all() if row[0]
        ]

        currency_code = trip.currency.code if trip.currency else None

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "data": {
                    "summary": {
                        "total_amount": round(total_amount, 2),
                        "total_count": total_count,
                        "avg_amount": round(avg_amount, 2),
                        "currency": currency_code,
                    },
                    "category_breakdown": category_breakdown,
                    "user_breakdown": user_breakdown,
                    "timeline": timeline,
                    "filters": {
                        "users": filter_users,
                        "categories": filter_categories,
                    },
                },
            },
        )

    except Exception as e:
        print("get_trip_analytics error:", e)
        raise


# 消費紀錄圖片
@app.post("/api/transaction/{transaction_id}/image")
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


@app.delete("/api/transaction/{transaction_id}/image")
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

        transaction = db.get(Transaction, transaction_id)

        if transaction is None:
            return JSONResponse(
                status_code=400, content={"error": True, "message": "該交易不存在"}
            )

        if not transaction.image_filename:
            return {"ok": True}

        ImageService.delete_image(transaction.image_filename)

        transaction.image_filename = None

        db.commit()

        return {"ok": True}
    except Exception as e:
        print(e)
        raise


# 通知
@app.get("/api/notifications")
def get_notifications(
    request: Request,
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

        notifications = (
            db.execute(select(Notification).where(Notification.user_id == user_id))
            .scalars()
            .all()
        )
        if notifications:
            notification = []
            for msg in notifications:
                notification.append(msg.message)

            db.execute(delete(Notification).where(Notification.user_id == user_id))
            db.commit()

            return JSONResponse(
                status_code=200,
                content={"ok": True, "notification": notification},
            )

        return JSONResponse(
            status_code=200,
            content={"ok": True, "notification": []},
        )

    except Exception as e:
        print(e)
        raise

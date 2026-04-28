# Mint Journeys

![mint jorneys](readme_image/loging.gif)

> 一個專為為旅遊而生的記帳網站

Mint Journeys 提供完整的旅遊記帳體驗，包含會員登入、旅程記帳、相片記錄與多人協作功能。

🌐 **Mint Jorneys 線上網站連結：[mintjourneys.com](https://mintjourneys.com)**



## ✨ 目錄

1. [**功能特色**](#-功能特色)
1. [**功能展示**](#-功能展示)
1. [**使用技術**](#-使用技術)
1. [**系統架構圖**](#-系統架構圖)
1. [**圖片上傳流程圖**](#-圖片上傳流程圖)
1. [**資料庫關係圖**](#-資料庫關係圖)
1. [**使用技術**](#-專案結構)
1. [**快速開始本地開發**](#-快速開始本地開發)
1. [**本地開發不用-docker**](#-本地開發不用-docker)



## ✨ 功能特色

- **會員系統** — 會員以信箱、密碼註冊帳號
- **旅程紀錄** — 設定專屬行程，名稱、多位共同編輯成員
- **多人協作** — 分為自己的行程和共享的行程總覽
- **新增圖片** — 不論是旅程封面圖或是消費紀錄都可以新增圖片

## ✨ 功能展示

![通知](readme_image/notification.gif)

- 使用者登入時，如果有被加進共享行程，會收到通知。

![電子信箱驗證](readme_image/verify.gif)

- 新增共同編輯者時，先進行驗證，如果是不符合正確 Email 格式或是未註冊的 Email 信箱會先行通知，無法新增行程。

![圖片上傳](readme_image/photo_upload.gif)

- 支援圖片上傳功能。

![消費紀錄展示](readme_image/transaction_detail.gif)

- 消費紀錄支援筆記與圖片上傳功能。

![消費紀錄分析](readme_image/analyze.gif)

- 可以針對「消費對象」、「消費時間」、「消費類別」進行消費分析。


## 🛠 使用技術

### Frontend
- React
- TypeScript

### Backend
- Python
- FastAPI 
- SQLAlchemy
- JWT + bcrypt

### Database & Storage
- PostgreSQL
- AWS S3

### Deployment
- AWS EC2
- Nginx
- Docker、Docker Compose

## 🗂 系統架構圖

![系統架構圖](readme_image/mintjourneys-architecture-diagram.webp)

## 🗂 圖片上傳流程圖

![圖片上傳流程圖](readme_image/mintjourneys-photoflow.webp)

## 🗂 資料庫關係圖

![資料庫關係圖](readme_image/ERD.webp)

## 🗂 專案結構

```
mint-journeys/
├── frontend/
│   └── mint-journeys/
│       ├── public/
│       ├── src/
│       │   ├── main.tsx        # App 入口
│       │   ├── app.tsx         # App 初始化
│       │   ├── routes.tsx      # 路由設定
│       │   ├── pages/          # 頁面（核心功能）
│       │   │   ├── LoginPage.tsx              # 功能介紹登入畫面
│       │   │   ├── AppLayout.tsx              # header
│       │   │   ├── HomePage.tsx               # 顯示旅程總覽首頁
│       │   │   ├── AuthPage.tsx               # 會員註冊登入頁
│       │   │   ├── TripFormPage.tsx           # 旅程新增修改表格
│       │   │   ├── TripDetailPage.tsx         # 旅程畫面
│       │   │   ├── TransactionFormPage.tsx    # 新增交易表格
│       │   │   ├── TransactionDetailPage.tsx  # 詳細交易紀錄
│       │   │   └── ErrorPage.tsx              # 錯誤畫面
│       │   ├── styles/        # 主題顏色
│       │   └── assets/        # 圖片/影片檔
│       ├── package.json
│       ├── vite.config.ts
│       ├── nginx.conf
│       └── Dockerfile
│
├── backend/
│   ├── main.py                # API 服務 
│   ├── database.py            # 資料庫連線設定
│   ├── models
│   │   ├── table_models.py    # 資料庫設定
│   │   ├── schemas.py        
│   │   └── image_service.py   # 圖片上傳相關服務
│   ├── seed.py
│   ├── .env.example           # 環境變數範例
│   ├── requirements.txt
│   └── Dockerfile
│
└── docker-compose.yml
```



## 🚀 快速開始（本地開發）

### 環境需求

- [Docker](https://www.docker.com/) 與 Docker Compose

### 安裝與啟動

**1. 複製專案**

```bash
git clone https://github.com/shih3807/mint-journeys.git
cd mint-journeys
```

**2. 設定環境變數**

在 `backend/` 目錄下建立 `.env` 檔案（可參考.env.example）：

```env
# PostgreSQL
POSTGRES_USER=""
POSTGRES_PASSWORD=""
POSTGRES_DB=""
POSTGRES_HOST=""
POSTGRES_PORT=""

# JWT
TOKEN_SECRET=""

# AWS S3
AWS_S3_BUCKET_NAME=""
AWS_REGION=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

CLOUDFRONT_DOMAIN =""
```

**3. 啟動服務**

```bash
docker compose up --build
```

**4. 開啟瀏覽器**

前往 [http://localhost](http://localhost) 即可使用。

| 服務 | 位址 |
|------|------|
| 前端 | http://localhost |
| 後端 API | http://localhost:8000 |
| API 文件 | http://localhost:8000/docs |



## 💻 本地開發（不用 Docker）

### 前端

```bash
cd frontend/mint-journeys
npm install
npm run dev
```

### 後端
**1. 設定環境變數**

在 `backend/` 目錄下建立 `.env` 檔案（可參考.env.example）：

```env
# PostgreSQL
POSTGRES_USER=""
POSTGRES_PASSWORD=""
POSTGRES_DB=""
POSTGRES_HOST=""
POSTGRES_PORT=""

# JWT
TOKEN_SECRET=""

# AWS S3
AWS_S3_BUCKET_NAME=""
AWS_REGION=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

CLOUDFRONT_DOMAIN =""
```

**2. 啟動 uvicorn**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 開啟瀏覽器

| 服務 | 位址 |
|------|------|
| 前端 | http://localhost:5173 |
| 後端 API | http://localhost:8000 |
| API 文件 | http://localhost:8000/docs |


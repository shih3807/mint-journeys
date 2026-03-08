FROM python:3.14-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

WORKDIR /app/backend

EXPOSE 8000

CMD ["python3","-m","uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

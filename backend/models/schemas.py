from pydantic import BaseModel
from typing import Optional
from datetime import date


class SingupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str

class CreateTripRequest(BaseModel):
    name: str
    member_email: Optional[str] = None
    base_currency: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class TransactionCreate(BaseModel):
    trip_id: int
    category_id: int
    amount: float
    currency_id: int
    description: Optional[str]
    transaction_date: Optional[date] = None



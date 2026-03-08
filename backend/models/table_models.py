from database import Base

from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import String, ForeignKey, Float, DateTime, Date, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hash_password: Mapped[str] = mapped_column(String(255), nullable=False)
    headshot_filename: Mapped[Optional[str]] = mapped_column(String(225))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    trips_created: Mapped[Optional[List["Trip"]]] = relationship("Trip", back_populates="creator")
    transactions: Mapped[Optional[List["Transaction"]]] = relationship(
        "Transaction", back_populates="user"
    )


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_currency: Mapped[Optional[str]] = mapped_column(ForeignKey("currencies.code"))
    background_filename: Mapped[Optional[str]] = mapped_column(String(225))
    budget: Mapped[Optional[float]] = mapped_column(Float)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    creator: Mapped["User"] = relationship("User", back_populates="trips_created")
    members: Mapped[List["TripMember"]] = relationship(
        "TripMember", back_populates="trip"
    )
    transactions: Mapped[Optional[List["Transaction"]]] = relationship(
        "Transaction", back_populates="trip"
    )


class TripMember(Base):
    __tablename__ = "trip_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    trip: Mapped["Trip"] = relationship("Trip", back_populates="members")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    is_default: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class Currency(Base):
    __tablename__ = "currencies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(3), unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(50))
    symbol: Mapped[Optional[str]] = mapped_column(String(10))


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"))
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3),ForeignKey("currencies.code")
    )
    description: Mapped[Optional[str]] = mapped_column(String(255))
    transaction_date: Mapped[Optional[date]] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    trip: Mapped["Trip"] = relationship("Trip", back_populates="transactions")
    user: Mapped["User"] = relationship("User", back_populates="transactions")


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id: Mapped[int] = mapped_column(primary_key=True)
    base_currency: Mapped[Optional[str]] = mapped_column(
        String(3), ForeignKey("currencies.code")
    )
    target_currency: Mapped[Optional[str]] = mapped_column(
        String(3), ForeignKey("currencies.code")
    )
    rate: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)

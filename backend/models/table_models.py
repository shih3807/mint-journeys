from database import Base

from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import String, ForeignKey, Float, DateTime, Date, func
from sqlalchemy.orm import Mapped, mapped_column, relationship


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hash_password: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_filename: Mapped[Optional[str]] = mapped_column(String(225))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    trips_created: Mapped[Optional[List["Trip"]]] = relationship(
        "Trip", back_populates="creator"
    )
    transactions: Mapped[Optional[List["Transaction"]]] = relationship(
        "Transaction", back_populates="user"
    )


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_currency_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("currencies.id"), ondelete="SET NULL"
    )
    image_filename: Mapped[Optional[str]] = mapped_column(String(225))
    budget: Mapped[Optional[float]] = mapped_column(Float)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), ondelete="SET NULL"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    creator: Mapped["User"] = relationship("User", back_populates="trips_created")
    members: Mapped[List["TripMember"]] = relationship(
        "TripMember", back_populates="trip", cascade="all, delete-orphan"
    )
    currency: Mapped["Currency"] = relationship("Currency")
    transactions: Mapped[Optional[List["Transaction"]]] = relationship(
        "Transaction", back_populates="trip", cascade="all, delete-orphan"
    )


class TripMember(Base):
    __tablename__ = "trip_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"), ondelete="CASCADE")
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), ondelete="CASCADE")
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    trip: Mapped["Trip"] = relationship("Trip", back_populates="members")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), ondelete="CASCADE"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class Currency(Base):
    __tablename__ = "currencies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(3), unique=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(50))


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"), ondelete="CASCADE")
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), ondelete="SET NULL"
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("categories.id"), ondelete="SET NULL"
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("currencies.id"), ondelete="SET NULL"
    )
    base_currency_amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    transaction_date: Mapped[Optional[date]] = mapped_column(Date)
    image_filename: Mapped[Optional[str]] = mapped_column(String(225))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    currency: Mapped["Currency"] = relationship("Currency")
    category: Mapped["Category"] = relationship("Category")
    trip: Mapped["Trip"] = relationship("Trip", back_populates="transactions")
    user: Mapped["User"] = relationship("User", back_populates="transactions")


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id: Mapped[int] = mapped_column(primary_key=True)
    base_currency: Mapped[str] = mapped_column(
        String(3), ForeignKey("currencies.code"), ondelete="CASCADE"
    )
    target_currency: Mapped[str] = mapped_column(
        String(3), ForeignKey("currencies.code", ondelete="CASCADE")
    )
    rate: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), ondelete="CASCADE")
    message: Mapped[int] = mapped_column(String(225))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

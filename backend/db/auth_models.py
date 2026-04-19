from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base, engine


class User(Base):
    __tablename__ = "users"

    id             : Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    email          : Mapped[str]            = mapped_column(String(255), unique=True, nullable=False, index=True)
    username       : Mapped[str]            = mapped_column(String(80),  unique=True, nullable=False, index=True)
    hashed_password: Mapped[str]            = mapped_column(Text, nullable=False)
    full_name      : Mapped[str]            = mapped_column(String(120), default="")
    is_active      : Mapped[bool]           = mapped_column(Boolean, default=True)
    is_verified    : Mapped[bool]           = mapped_column(Boolean, default=False)
    created_at     : Mapped[datetime]       = mapped_column(DateTime, default=datetime.utcnow)
    last_login     : Mapped[datetime | None]= mapped_column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User {self.email}>"


def init_auth_tables():
    Base.metadata.create_all(bind=engine, tables=[User.__table__])
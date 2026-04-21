from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, Text, inspect, text
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base, engine


class User(Base):
    __tablename__ = "users"

    id              : Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    email           : Mapped[str]             = mapped_column(String(255), unique=True, nullable=False, index=True)
    username        : Mapped[str]             = mapped_column(String(80),  unique=True, nullable=False, index=True)
    hashed_password : Mapped[str | None]      = mapped_column(Text, nullable=True)        
    full_name       : Mapped[str]             = mapped_column(String(120), default="")
    avatar_url      : Mapped[str | None]      = mapped_column(String(512), nullable=True) 
    is_active       : Mapped[bool]            = mapped_column(Boolean, default=True)
    is_verified     : Mapped[bool]            = mapped_column(Boolean, default=False)
    created_at      : Mapped[datetime]        = mapped_column(DateTime, default=datetime.utcnow)
    last_login      : Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    auth_provider   : Mapped[str]             = mapped_column(String(20),  default="local", index=True)
    provider_id     : Mapped[str | None]      = mapped_column(String(255), nullable=True, index=True)

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.auth_provider}]>"

    @property
    def is_oauth(self) -> bool:
        return self.auth_provider != "local"


def init_auth_tables() -> None:
    Base.metadata.create_all(bind=engine, tables=[User.__table__])
    _ensure_user_table_columns()


def _ensure_user_table_columns() -> None:
    inspector = inspect(engine)
    columns = inspector.get_columns("users")
    existing_columns = {column["name"] for column in columns}
    columns_by_name = {column["name"]: column for column in columns}
    expected_columns = {
        "full_name": "VARCHAR(120) NOT NULL DEFAULT ''",
        "avatar_url": "VARCHAR(512)",
        "is_active": "BOOLEAN NOT NULL DEFAULT TRUE",
        "is_verified": "BOOLEAN NOT NULL DEFAULT FALSE",
        "created_at": "TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP",
        "last_login": "TIMESTAMP WITHOUT TIME ZONE NULL",
        "auth_provider": "VARCHAR(20) NOT NULL DEFAULT 'local'",
        "provider_id": "VARCHAR(255) NULL",
    }

    with engine.begin() as conn:
        for column_name, column_definition in expected_columns.items():
            if column_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_definition}"))

        hashed_password_col = columns_by_name.get("hashed_password")
        if hashed_password_col and not hashed_password_col.get("nullable", True):
            conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
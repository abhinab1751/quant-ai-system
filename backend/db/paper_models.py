from db.database import (
    PaperSession,
    PaperOrder,
    PaperTrade,
    PaperPosition,
    PaperSnapshot,
    init_db,
)


def init_paper_tables():
    init_db()


__all__ = [
    "PaperSession",
    "PaperOrder",
    "PaperTrade",
    "PaperPosition",
    "PaperSnapshot",
    "init_paper_tables",
]

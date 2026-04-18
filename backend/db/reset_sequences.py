"""
Utility script to reset PostgreSQL sequences to match current max IDs in tables.
Run this when you get "duplicate key value" errors due to sequence drift.
"""

from sqlalchemy import text
from db.database import SessionLocal


def reset_all_sequences():
    """Reset all sequences to match the maximum ID in each table."""
    db = SessionLocal()
    try:
        tables_to_reset = [
            ("backtest_run", "id"),
            ("price", "id"),
            ("prediction", "id"),
            ("model_meta", "id"),
            ("paper_session", "id"),
            ("paper_order", "id"),
            ("paper_trade", "id"),
            ("paper_position", "id"),
            ("paper_snapshot", "id"),
        ]
        
        for table_name, id_col in tables_to_reset:
            try:
                # Get the maximum ID in the table
                result = db.execute(text(f"SELECT MAX({id_col}) FROM {table_name}")).scalar()
                max_id = result or 0
                
                # Reset the sequence
                seq_name = f"{table_name}_{id_col}_seq"
                db.execute(text(f"SELECT setval('{seq_name}', {max_id + 1})"))
                print(f"✓ Reset {seq_name} to {max_id + 1}")
            except Exception as e:
                print(f"✗ Error resetting {table_name}: {e}")
        
        db.commit()
        print("\nAll sequences reset successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    reset_all_sequences()

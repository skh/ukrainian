"""split comma-separated noun form variants into separate rows

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-01 00:03:00.000000

Goroh sometimes puts multiple valid forms in one cell (e.g. "селу́, селі́").
These were stored as-is. Split each into individual rows so form fields are
always a single form string.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    rows = conn.execute(sa.text(
        "SELECT id, lexeme_id, tags, form FROM lexeme_forms WHERE lexeme_id IS NOT NULL AND form LIKE '%,%'"
    )).fetchall()

    for row_id, lexeme_id, tags, form in rows:
        variants = [v.strip() for v in form.split(',') if v.strip()]
        if len(variants) <= 1:
            continue
        # Update existing row to first variant
        conn.execute(sa.text(
            "UPDATE lexeme_forms SET form = :form WHERE id = :id"
        ), {"form": variants[0], "id": row_id})
        # Insert remaining variants
        for variant in variants[1:]:
            conn.execute(sa.text(
                "INSERT INTO lexeme_forms (lexeme_id, tags, form) VALUES (:lexeme_id, :tags, :form)"
            ), {"lexeme_id": lexeme_id, "tags": tags, "form": variant})


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported — restore from backup")

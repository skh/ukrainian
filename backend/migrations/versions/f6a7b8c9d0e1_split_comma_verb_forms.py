"""split comma-separated verb form variants into separate rows

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-16 00:00:00.000000

Verb forms imported from goroh sometimes contain multiple variants in one
cell (e.g. "осво́їлась, осво́їлася"). Split each into individual rows so
form fields are always a single form string — mirrors d4e5f6a7b8c9 for nouns.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    rows = conn.execute(sa.text(
        "SELECT id, verb_id, tags, form FROM lexeme_forms WHERE verb_id IS NOT NULL AND form LIKE '%,%'"
    )).fetchall()

    for row_id, verb_id, tags, form in rows:
        variants = [v.strip() for v in form.split(',') if v.strip()]
        if len(variants) <= 1:
            continue
        conn.execute(sa.text(
            "UPDATE lexeme_forms SET form = :form WHERE id = :id"
        ), {"form": variants[0], "id": row_id})
        for variant in variants[1:]:
            conn.execute(sa.text(
                "INSERT INTO lexeme_forms (verb_id, tags, form) VALUES (:verb_id, :tags, :form)"
            ), {"verb_id": verb_id, "tags": tags, "form": variant})


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported — restore from backup")

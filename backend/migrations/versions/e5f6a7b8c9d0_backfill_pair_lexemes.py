"""Backfill missing pair lexemes

Revision ID: e5f6a7b8c9d0
Revises: c3d4e5f6a7b8
Create Date: 2026-04-16 00:00:00.000000

Some aspect pairs were created without a corresponding Lexeme row
(pos='pair', pair_id=pair.id). Without it, the text-analysis lookup
cannot find verb forms for those pairs. This migration backfills the
missing Lexeme rows using the ipf verb's infinitive/accented, falling
back to the pf verb if no ipf is present.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Find pairs that have no lexeme
    pairs_without_lexeme = conn.execute(sa.text("""
        SELECT ap.id, ap.ipf_verb_id, ap.pf_verb_id
        FROM aspect_pairs ap
        WHERE NOT EXISTS (
            SELECT 1 FROM lexemes l WHERE l.pair_id = ap.id
        )
    """)).fetchall()

    for pair_id, ipf_verb_id, pf_verb_id in pairs_without_lexeme:
        verb_id = ipf_verb_id or pf_verb_id
        verb = conn.execute(
            sa.text("SELECT infinitive, accented FROM verbs WHERE id = :id"),
            {"id": verb_id}
        ).fetchone()
        if not verb:
            continue
        conn.execute(sa.text("""
            INSERT INTO lexemes (pos, lemma, accented, pair_id)
            VALUES ('pair', :lemma, :accented, :pair_id)
        """), {"lemma": verb.infinitive, "accented": verb.accented, "pair_id": pair_id})


def downgrade() -> None:
    pass

"""word families

Revision ID: h1d5e3f07a49
Revises: g7c4b2f96e38
Create Date: 2026-03-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'h1d5e3f07a49'
down_revision: Union[str, None] = 'g7c4b2f96e38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'lexemes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('pos', sa.String(), nullable=False),
        sa.Column('form', sa.String(), nullable=False),
        sa.Column('pair_id', sa.Integer(), sa.ForeignKey('aspect_pairs.id', ondelete='CASCADE'), nullable=True),
        sa.CheckConstraint(
            "(pos = 'pair' AND pair_id IS NOT NULL) OR (pos != 'pair' AND pair_id IS NULL)",
            name='ck_lexemes_pair_id_consistent',
        ),
        sa.CheckConstraint(
            "pos IN ('pair', 'noun', 'adjective', 'adverb')",
            name='ck_lexemes_pos',
        ),
        sa.UniqueConstraint('pair_id', name='uq_lexemes_pair_id'),
    )

    op.create_table(
        'word_families',
        sa.Column('id', sa.Integer(), primary_key=True),
    )

    op.create_table(
        'word_family_members',
        sa.Column('family_id', sa.Integer(), sa.ForeignKey('word_families.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('lexeme_id', sa.Integer(), sa.ForeignKey('lexemes.id', ondelete='CASCADE'), primary_key=True),
    )

    # Backfill one lexeme row per existing aspect pair.
    # form = ipf infinitive if available, otherwise pf infinitive.
    op.execute("""
        INSERT INTO lexemes (pos, form, pair_id)
        SELECT
            'pair',
            COALESCE(v_ipf.infinitive, v_pf.infinitive),
            p.id
        FROM aspect_pairs p
        LEFT JOIN verbs v_ipf ON v_ipf.id = p.ipf_verb_id
        LEFT JOIN verbs v_pf  ON v_pf.id  = p.pf_verb_id
    """)


def downgrade() -> None:
    op.drop_table('word_family_members')
    op.drop_table('word_families')
    op.drop_table('lexemes')

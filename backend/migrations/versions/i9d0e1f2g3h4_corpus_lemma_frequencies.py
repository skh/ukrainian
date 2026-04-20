"""Replace lexeme_frequencies with corpus_lemma_frequencies

Revision ID: i9d0e1f2g3h4
Revises: h8c9d0e1f2g3
Create Date: 2026-04-19 00:00:00.000000

Drop the per-lexeme API-fetched table; add a flat reference table
populated from Sketch Engine CSV exports.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'i9d0e1f2g3h4'
down_revision: Union[str, Sequence[str], None] = 'h8c9d0e1f2g3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('lexeme_frequencies')
    op.create_table(
        'corpus_lemma_frequencies',
        sa.Column('corpus', sa.String(), nullable=False),
        sa.Column('lemma', sa.String(), nullable=False),
        sa.Column('freq', sa.Integer(), nullable=False),
        sa.Column('ipm', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('corpus', 'lemma'),
    )


def downgrade() -> None:
    op.drop_table('corpus_lemma_frequencies')
    op.create_table(
        'lexeme_frequencies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lexeme_id', sa.Integer(), nullable=False),
        sa.Column('corpus', sa.String(), nullable=False),
        sa.Column('ipm', sa.Float(), nullable=False),
        sa.Column('fetched_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('lexeme_id', 'corpus', name='uq_lexeme_frequencies'),
    )

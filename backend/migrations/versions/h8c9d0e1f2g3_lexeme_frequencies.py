"""Add lexeme_frequencies table

Revision ID: h8c9d0e1f2g3
Revises: g7b8c9d0e1f2
Create Date: 2026-04-18 00:00:00.000000

Mirrors verb_frequencies but for non-verb lexemes (nouns, adjectives, etc.).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'h8c9d0e1f2g3'
down_revision: Union[str, Sequence[str], None] = 'g7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'lexeme_frequencies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lexeme_id', sa.Integer(), sa.ForeignKey('lexemes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('corpus', sa.String(), nullable=False),
        sa.Column('ipm', sa.Float(), nullable=False),
        sa.Column('fetched_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('lexeme_id', 'corpus', name='uq_lexeme_frequencies'),
    )


def downgrade() -> None:
    op.drop_table('lexeme_frequencies')

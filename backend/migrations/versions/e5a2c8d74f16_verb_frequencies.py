"""verb frequencies

Revision ID: e5a2c8d74f16
Revises: d4e9f1b63c22
Create Date: 2026-03-09 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e5a2c8d74f16'
down_revision: Union[str, None] = 'd4e9f1b63c22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'verb_frequencies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('verb_id', sa.Integer(), sa.ForeignKey('verbs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('corpus', sa.String(), nullable=False),
        sa.Column('ipm', sa.Float(), nullable=False),
        sa.Column('fetched_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('verb_id', 'corpus', name='uq_verb_frequencies'),
    )


def downgrade() -> None:
    op.drop_table('verb_frequencies')

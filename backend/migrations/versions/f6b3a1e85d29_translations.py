"""translations

Revision ID: f6b3a1e85d29
Revises: e5a2c8d74f16
Create Date: 2026-03-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f6b3a1e85d29'
down_revision: Union[str, None] = 'e5a2c8d74f16'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'pair_translations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('pair_id', sa.Integer(), sa.ForeignKey('aspect_pairs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lang', sa.String(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
    )
    op.create_table(
        'collocation_translations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('collocation_id', sa.Integer(), sa.ForeignKey('collocations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lang', sa.String(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('collocation_translations')
    op.drop_table('pair_translations')

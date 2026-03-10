"""collocations

Revision ID: d4e9f1b63c22
Revises: c7d2e5a84b31
Create Date: 2026-03-09 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4e9f1b63c22'
down_revision: Union[str, None] = 'c7d2e5a84b31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'collocations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('pair_id', sa.Integer(), sa.ForeignKey('aspect_pairs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('collocations')

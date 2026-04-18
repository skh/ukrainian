"""Add variant_of FK to verbs

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-04-18 00:00:00.000000

A verb can be a variant of another verb with the same meaning but a different
stem (e.g. притягати / притягувати as ipf variants). The variant_of FK points
to the canonical verb; the variant shares the canonical verb's aspect pair and
its translations/drills.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'g7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('verbs', sa.Column('variant_of', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('verbs', 'variant_of')

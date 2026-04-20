"""Add cefr_entries table

Revision ID: k1f2g3h4i5j6
Revises: j0e1f2g3h4i5
Create Date: 2026-04-19 00:00:00.000000

CEFR levels from puls.peremova.org, keyed by lowercase lemma.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'k1f2g3h4i5j6'
down_revision: Union[str, Sequence[str], None] = 'j0e1f2g3h4i5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cefr_entries',
        sa.Column('lemma', sa.String(), nullable=False),
        sa.Column('level', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('lemma'),
    )


def downgrade() -> None:
    op.drop_table('cefr_entries')

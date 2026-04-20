"""Drop verb_frequencies table; use corpus_lemma_frequencies for verb ipm lookups

Revision ID: j0e1f2g3h4i5
Revises: i9d0e1f2g3h4
Create Date: 2026-04-19 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'j0e1f2g3h4i5'
down_revision: Union[str, Sequence[str], None] = 'i9d0e1f2g3h4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('verb_frequencies')


def downgrade() -> None:
    op.create_table(
        'verb_frequencies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('verb_id', sa.Integer(), nullable=False),
        sa.Column('corpus', sa.String(), nullable=False),
        sa.Column('ipm', sa.Float(), nullable=False),
        sa.Column('fetched_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('verb_id', 'corpus', name='uq_verb_frequencies'),
    )

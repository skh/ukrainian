"""solo verbs - nullable aspect pair FKs

Revision ID: g7c4b2f96e38
Revises: f6b3a1e85d29
Create Date: 2026-03-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'g7c4b2f96e38'
down_revision: Union[str, None] = 'f6b3a1e85d29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('aspect_pairs') as batch_op:
        batch_op.alter_column('ipf_verb_id', existing_type=sa.Integer(), nullable=True)
        batch_op.alter_column('pf_verb_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('aspect_pairs') as batch_op:
        batch_op.alter_column('ipf_verb_id', existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column('pf_verb_id', existing_type=sa.Integer(), nullable=False)

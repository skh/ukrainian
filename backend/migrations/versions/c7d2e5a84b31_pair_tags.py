"""pair tags

Revision ID: c7d2e5a84b31
Revises: a3f8c2d91e04
Create Date: 2026-03-08 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d2e5a84b31'
down_revision: Union[str, Sequence[str], None] = 'a3f8c2d91e04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('word_tags')
    op.create_table(
        'pair_tags',
        sa.Column('pair_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['pair_id'], ['aspect_pairs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('pair_id', 'tag_id'),
    )


def downgrade() -> None:
    op.drop_table('pair_tags')
    op.create_table(
        'word_tags',
        sa.Column('verb_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['verb_id'], ['verbs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('verb_id', 'tag_id'),
    )

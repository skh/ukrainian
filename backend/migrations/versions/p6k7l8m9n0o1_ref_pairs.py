"""Add ref_pairs table

Revision ID: p6k7l8m9n0o1
Revises: o5j6k7l8m9n0
Create Date: 2026-04-30 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'p6k7l8m9n0o1'
down_revision = 'o5j6k7l8m9n0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ref_pairs',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('ipf', sa.String, nullable=True),
        sa.Column('pf', sa.String, nullable=True),
        sa.Column('source', sa.String, nullable=True),
        sa.Column('notes', sa.String, nullable=True),
        sa.CheckConstraint('ipf IS NOT NULL OR pf IS NOT NULL', name='ck_ref_pairs_not_both_null'),
    )


def downgrade():
    op.drop_table('ref_pairs')

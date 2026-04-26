"""Add drill_configs table

Revision ID: n4i5j6k7l8m9
Revises: m3h4i5j6k7l8
Create Date: 2026-04-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'n4i5j6k7l8m9'
down_revision = 'm3h4i5j6k7l8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'drill_configs',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('config', sa.Text, nullable=False),
    )


def downgrade():
    op.drop_table('drill_configs')

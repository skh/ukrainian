"""Replace pair_tags with lexeme_tags

Revision ID: l2g3h4i5j6k7
Revises: k1f2g3h4i5j6
Create Date: 2026-04-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'l2g3h4i5j6k7'
down_revision = 'k1f2g3h4i5j6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'lexeme_tags',
        sa.Column('lexeme_id', sa.Integer, sa.ForeignKey('lexemes.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('tag_id', sa.Integer, sa.ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
    )
    # Migrate existing pair_tags → lexeme_tags via the pair's lexeme
    op.execute("""
        INSERT INTO lexeme_tags (lexeme_id, tag_id)
        SELECT l.id, pt.tag_id
        FROM pair_tags pt
        JOIN lexemes l ON l.pair_id = pt.pair_id
    """)
    op.drop_table('pair_tags')


def downgrade():
    op.create_table(
        'pair_tags',
        sa.Column('pair_id', sa.Integer, sa.ForeignKey('aspect_pairs.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('tag_id', sa.Integer, sa.ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
    )
    op.execute("""
        INSERT INTO pair_tags (pair_id, tag_id)
        SELECT l.pair_id, lt.tag_id
        FROM lexeme_tags lt
        JOIN lexemes l ON l.id = lt.lexeme_id
        WHERE l.pair_id IS NOT NULL
    """)
    op.drop_table('lexeme_tags')

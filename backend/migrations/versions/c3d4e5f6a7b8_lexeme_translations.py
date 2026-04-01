"""replace pair_translations with lexeme_translations

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-01 00:02:00.000000

- Create lexeme_translations (id, lexeme_id FK→lexemes, lang, text)
- Migrate pair_translations rows via lexemes.pair_id join
- Drop pair_translations
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    op.create_table(
        'lexeme_translations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lexeme_id', sa.Integer(), nullable=False),
        sa.Column('lang', sa.String(), nullable=False),
        sa.Column('text', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['lexeme_id'], ['lexemes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Migrate existing pair_translations → lexeme_translations via lexemes.pair_id
    conn.execute(sa.text("""
        INSERT INTO lexeme_translations (lexeme_id, lang, text)
        SELECT l.id, pt.lang, pt.text
        FROM pair_translations pt
        JOIN lexemes l ON l.pair_id = pt.pair_id
    """))

    op.drop_table('pair_translations')


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported — restore from backup")

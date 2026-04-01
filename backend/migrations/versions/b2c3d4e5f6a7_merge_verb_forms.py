"""merge verb_forms into lexeme_forms

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-01 00:01:00.000000

- lexeme_forms gains nullable verb_id FK → verbs.id; lexeme_id made nullable
- verb_forms rows inserted into lexeme_forms with tags = "tense[,person][,number][,gender]"
- verb_forms table dropped
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Recreate lexeme_forms with lexeme_id nullable and verb_id added
    op.create_table(
        'lexeme_forms_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lexeme_id', sa.Integer(), nullable=True),
        sa.Column('verb_id', sa.Integer(), nullable=True),
        sa.Column('tags', sa.String(), nullable=False),
        sa.Column('form', sa.String(), nullable=False),
        sa.CheckConstraint(
            "(lexeme_id IS NOT NULL AND verb_id IS NULL) OR (lexeme_id IS NULL AND verb_id IS NOT NULL)",
            name='ck_lexeme_forms_one_parent',
        ),
        sa.ForeignKeyConstraint(['lexeme_id'], ['lexemes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['verb_id'], ['verbs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Copy existing lexeme_forms rows (lexeme_id set, verb_id null)
    conn.execute(sa.text("""
        INSERT INTO lexeme_forms_new (id, lexeme_id, verb_id, tags, form)
        SELECT id, lexeme_id, NULL, tags, form
        FROM lexeme_forms
    """))

    # Insert verb_forms rows: encode tense/person/number/gender as comma-joined tag string
    conn.execute(sa.text("""
        INSERT INTO lexeme_forms_new (verb_id, lexeme_id, tags, form)
        SELECT
            verb_id,
            NULL,
            tense ||
                COALESCE(',' || person, '') ||
                COALESCE(',' || number, '') ||
                COALESCE(',' || gender, ''),
            form
        FROM verb_forms
    """))

    op.drop_table('lexeme_forms')
    op.drop_table('verb_forms')
    op.rename_table('lexeme_forms_new', 'lexeme_forms')


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported — restore from backup")

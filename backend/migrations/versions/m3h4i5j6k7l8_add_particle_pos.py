"""Add particle to lexemes pos constraint

Revision ID: m3h4i5j6k7l8
Revises: l2g3h4i5j6k7
Create Date: 2026-04-20 00:00:00.000000
"""
from alembic import op

revision = 'm3h4i5j6k7l8'
down_revision = 'l2g3h4i5j6k7'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('lexemes') as batch_op:
        batch_op.drop_constraint('ck_lexemes_pos')
        batch_op.create_check_constraint(
            'ck_lexemes_pos',
            "pos IN ('pair', 'noun', 'adjective', 'adverb', 'conjunction', 'numeral', 'preposition', 'pronoun', 'particle')",
        )


def downgrade():
    with op.batch_alter_table('lexemes') as batch_op:
        batch_op.drop_constraint('ck_lexemes_pos')
        batch_op.create_check_constraint(
            'ck_lexemes_pos',
            "pos IN ('pair', 'noun', 'adjective', 'adverb', 'conjunction', 'numeral', 'preposition', 'pronoun')",
        )

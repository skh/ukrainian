"""Add predicative to lexemes pos constraint

Revision ID: o5j6k7l8m9n0
Revises: n4i5j6k7l8m9
Create Date: 2026-04-28 00:00:00.000000
"""
from alembic import op

revision = 'o5j6k7l8m9n0'
down_revision = 'n4i5j6k7l8m9'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("lexemes") as batch_op:
        batch_op.drop_constraint("ck_lexemes_pos", type_="check")
        batch_op.create_check_constraint(
            "ck_lexemes_pos",
            "pos IN ('pair', 'noun', 'adjective', 'adverb', 'conjunction', 'numeral', 'preposition', 'pronoun', 'particle', 'predicative')",
        )


def downgrade():
    with op.batch_alter_table("lexemes") as batch_op:
        batch_op.drop_constraint("ck_lexemes_pos", type_="check")
        batch_op.create_check_constraint(
            "ck_lexemes_pos",
            "pos IN ('pair', 'noun', 'adjective', 'adverb', 'conjunction', 'numeral', 'preposition', 'pronoun', 'particle')",
        )

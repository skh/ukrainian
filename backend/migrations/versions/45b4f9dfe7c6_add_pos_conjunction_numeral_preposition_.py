"""add_pos_conjunction_numeral_preposition_pronoun

Revision ID: 45b4f9dfe7c6
Revises: 12e21fee1a62
Create Date: 2026-04-01 09:58:14.668586

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '45b4f9dfe7c6'
down_revision: Union[str, Sequence[str], None] = '12e21fee1a62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_ENTRIES_POS = "pos IN ('noun', 'adjective', 'adverb')"
NEW_ENTRIES_POS = "pos IN ('noun', 'adjective', 'adverb', 'conjunction', 'numeral', 'preposition', 'pronoun')"

OLD_LEXEMES_POS = "pos IN ('pair', 'noun', 'adjective', 'adverb')"
NEW_LEXEMES_POS = "pos IN ('pair', 'noun', 'adjective', 'adverb', 'conjunction', 'numeral', 'preposition', 'pronoun')"


def upgrade() -> None:
    with op.batch_alter_table("entries", schema=None) as batch_op:
        batch_op.drop_constraint("ck_entries_pos", type_="check")
        batch_op.create_check_constraint("ck_entries_pos", NEW_ENTRIES_POS)

    with op.batch_alter_table("lexemes", schema=None) as batch_op:
        batch_op.drop_constraint("ck_lexemes_pos", type_="check")
        batch_op.create_check_constraint("ck_lexemes_pos", NEW_LEXEMES_POS)


def downgrade() -> None:
    with op.batch_alter_table("entries", schema=None) as batch_op:
        batch_op.drop_constraint("ck_entries_pos", type_="check")
        batch_op.create_check_constraint("ck_entries_pos", OLD_ENTRIES_POS)

    with op.batch_alter_table("lexemes", schema=None) as batch_op:
        batch_op.drop_constraint("ck_lexemes_pos", type_="check")
        batch_op.create_check_constraint("ck_lexemes_pos", OLD_LEXEMES_POS)

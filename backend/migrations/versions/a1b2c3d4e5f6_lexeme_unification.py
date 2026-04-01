"""lexeme unification: entries→lexemes, drop bridge

Revision ID: a1b2c3d4e5f6
Revises: 464f6e2c6705
Create Date: 2026-04-01 00:00:00.000000

Merges 'entries' table and bridge 'lexemes' table into a single 'lexemes' table.
- Old entries → new lexemes (same IDs preserved)
- Old bridge lexemes with pair_id → new lexemes (new IDs)
- 'entry_forms' renamed to 'lexeme_forms', column 'entry_id' → 'lexeme_id'
- 'chunk_links.lexeme_id' and 'word_family_members.lexeme_id' remapped to new lexeme IDs
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '464f6e2c6705'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Create the new unified lexemes table (different name temporarily)
    op.create_table(
        'lexemes_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pos', sa.String(), nullable=False),
        sa.Column('lemma', sa.String(), nullable=False),
        sa.Column('accented', sa.String(), nullable=False),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('number_type', sa.String(), nullable=True),
        sa.Column('pair_id', sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "pos IN ('pair', 'noun', 'adjective', 'adverb', 'conjunction', 'numeral', 'preposition', 'pronoun')",
            name='ck_lexemes_pos',
        ),
        sa.CheckConstraint("gender IN ('m', 'f', 'n') OR gender IS NULL", name='ck_lexemes_gender'),
        sa.CheckConstraint(
            "number_type IN ('sg', 'pl', 'both') OR number_type IS NULL",
            name='ck_lexemes_number_type',
        ),
        sa.ForeignKeyConstraint(['pair_id'], ['aspect_pairs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('accented'),
        sa.UniqueConstraint('pair_id', name='uq_lexemes_pair_id'),
    )

    # 2. Copy old entries → new lexemes (preserving IDs)
    conn.execute(sa.text("""
        INSERT INTO lexemes_new (id, pos, lemma, accented, gender, number_type, pair_id)
        SELECT id, pos, lemma, accented, gender, number_type, NULL
        FROM entries
    """))

    # 3. Insert pair lexemes from bridge (using ipf verb's accented form if available)
    conn.execute(sa.text("""
        INSERT INTO lexemes_new (pos, lemma, accented, pair_id)
        SELECT
            'pair',
            COALESCE(v.infinitive, l.form),
            COALESCE(v.accented, l.form),
            l.pair_id
        FROM lexemes l
        LEFT JOIN aspect_pairs ap ON l.pair_id = ap.id
        LEFT JOIN verbs v ON ap.ipf_verb_id = v.id
        WHERE l.pair_id IS NOT NULL
    """))

    # 4. Build mapping: old bridge lexeme id → new lexeme id
    conn.execute(sa.text("CREATE TEMP TABLE lexeme_id_map (old_id INTEGER, new_id INTEGER)"))

    # Bridge rows that had entry_id: new id = entry_id (same as new lexeme id)
    conn.execute(sa.text("""
        INSERT INTO lexeme_id_map (old_id, new_id)
        SELECT l.id, l.entry_id
        FROM lexemes l
        WHERE l.entry_id IS NOT NULL
    """))

    # Bridge rows that had pair_id: new id = auto-assigned id in lexemes_new
    conn.execute(sa.text("""
        INSERT INTO lexeme_id_map (old_id, new_id)
        SELECT l.id, ln.id
        FROM lexemes l
        JOIN lexemes_new ln ON l.pair_id = ln.pair_id
        WHERE l.pair_id IS NOT NULL
    """))

    # 5. Recreate lexeme_forms (was entry_forms) with lexeme_id FK
    op.create_table(
        'lexeme_forms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lexeme_id', sa.Integer(), nullable=False),
        sa.Column('tags', sa.String(), nullable=False),
        sa.Column('form', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['lexeme_id'], ['lexemes_new.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    conn.execute(sa.text("""
        INSERT INTO lexeme_forms (id, lexeme_id, tags, form)
        SELECT id, entry_id, tags, form FROM entry_forms
    """))

    # 6. Recreate chunk_links with remapped lexeme_id
    op.create_table(
        'chunk_links_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('chunk_id', sa.Integer(), nullable=False),
        sa.Column('lexeme_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['chunk_id'], ['chunks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lexeme_id'], ['lexemes_new.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    conn.execute(sa.text("""
        INSERT INTO chunk_links_new (id, chunk_id, lexeme_id)
        SELECT cl.id, cl.chunk_id, m.new_id
        FROM chunk_links cl
        LEFT JOIN lexeme_id_map m ON cl.lexeme_id = m.old_id
    """))

    # 7. Recreate word_family_members with remapped lexeme_id
    op.create_table(
        'word_family_members_new',
        sa.Column('family_id', sa.Integer(), nullable=False),
        sa.Column('lexeme_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['family_id'], ['word_families.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lexeme_id'], ['lexemes_new.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('family_id', 'lexeme_id'),
    )
    conn.execute(sa.text("""
        INSERT INTO word_family_members_new (family_id, lexeme_id)
        SELECT wm.family_id, m.new_id
        FROM word_family_members wm
        JOIN lexeme_id_map m ON wm.lexeme_id = m.old_id
    """))

    # 8. Drop old tables
    op.drop_table('word_family_members')
    op.drop_table('chunk_links')
    op.drop_table('entry_forms')
    op.drop_table('lexemes')   # bridge table
    op.drop_table('entries')

    # 9. Rename new tables to final names
    op.rename_table('lexemes_new', 'lexemes')
    op.rename_table('chunk_links_new', 'chunk_links')
    op.rename_table('word_family_members_new', 'word_family_members')

    # lexeme_forms FK was created pointing to 'lexemes_new'; SQLite doesn't enforce FKs
    # so this is fine — the table was renamed after FK creation
    # (SQLite stores FK as text reference, rename doesn't break it in practice)


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported — restore from backup")

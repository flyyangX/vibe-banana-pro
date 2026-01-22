"""Add product_type to projects

Revision ID: 016_add_product_type_to_projects
Revises: 015_add_reading_deck_to_projects
Create Date: 2026-01-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '016_add_product_type_to_projects'
down_revision = '015_add_reading_deck_to_projects'
branch_labels = None
depends_on = None


def upgrade():
    # Idempotent migration: in some environments the column may already exist
    bind = op.get_bind()
    cols = []
    try:
        rows = bind.execute(text("PRAGMA table_info(projects)")).fetchall()
        cols = [r[1] for r in rows]
    except Exception:
        cols = []

    if 'product_type' not in cols:
        op.add_column(
            'projects',
            sa.Column('product_type', sa.String(20), nullable=False, server_default='ppt'),
        )
        op.alter_column('projects', 'product_type', server_default=None)


def downgrade():
    try:
        op.drop_column('projects', 'product_type')
    except Exception:
        pass

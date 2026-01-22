"""Add product_payload to projects

Revision ID: 017_add_product_payload_to_projects
Revises: 016_add_product_type_to_projects
Create Date: 2026-01-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '017_add_product_payload_to_projects'
down_revision = '016_add_product_type_to_projects'
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

    if 'product_payload' not in cols:
        op.add_column('projects', sa.Column('product_payload', sa.Text(), nullable=True))


def downgrade():
    try:
        op.drop_column('projects', 'product_payload')
    except Exception:
        pass

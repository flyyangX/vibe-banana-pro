"""Add product_tags to user_templates table

Revision ID: 018_add_product_tags_to_user_templates
Revises: 017_add_product_payload_to_projects
Create Date: 2025-02-08
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '018_add_product_tags_to_user_templates'
down_revision = '017_add_product_payload_to_projects'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'user_templates',
        sa.Column('product_tags', sa.Text(), nullable=True, server_default='["universal"]')
    )

    # Backfill existing rows
    op.execute("UPDATE user_templates SET product_tags = '[\"universal\"]' WHERE product_tags IS NULL")


def downgrade():
    op.drop_column('user_templates', 'product_tags')

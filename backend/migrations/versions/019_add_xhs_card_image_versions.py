"""Add xhs_card_image_versions table

Revision ID: 019_add_xhs_card_image_versions
Revises: 018_add_product_tags_to_user_templates
Create Date: 2025-02-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '019_add_xhs_card_image_versions'
down_revision = '018_add_product_tags_to_user_templates'
branch_labels = None
depends_on = None


def upgrade():
    # Idempotency: some environments may already have the table created
    # (e.g. manual creation / partial migrations). Avoid crashing startup.
    bind = op.get_bind()
    inspector = inspect(bind)
    if inspector.has_table('xhs_card_image_versions'):
        return

    op.create_table(
        'xhs_card_image_versions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('index', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.String(length=36), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id']),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        'ix_xhs_card_image_versions_project_index',
        'xhs_card_image_versions',
        ['project_id', 'index']
    )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if inspector.has_table('xhs_card_image_versions'):
        # index may not exist if upgrade short-circuited earlier
        try:
            op.drop_index('ix_xhs_card_image_versions_project_index', table_name='xhs_card_image_versions')
        except Exception:
            pass
        op.drop_table('xhs_card_image_versions')

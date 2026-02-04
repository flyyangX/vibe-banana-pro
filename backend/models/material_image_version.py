"""
Material Image Version model - stores historical versions of Material images
Used by infographic editing (and potentially other material-based products).
"""
import uuid
from datetime import datetime
from . import db


class MaterialImageVersion(db.Model):
    """
    Material image version model - tracks versions per project and (optional) page_id grouping.

    Group key:
    - project_id
    - mode (e.g. 'single' | 'series')
    - page_id (nullable; for single mode it can be None)
    """
    __tablename__ = 'material_image_versions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=False, index=True)
    mode = db.Column(db.String(20), nullable=False, default='single', index=True)
    page_id = db.Column(db.String(36), nullable=True, index=True)

    material_id = db.Column(db.String(36), db.ForeignKey('materials.id'), nullable=False, index=True)
    version_number = db.Column(db.Integer, nullable=False)
    is_current = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    material = db.relationship('Material')

    def to_dict(self):
        return {
            'version_id': self.id,
            'project_id': self.project_id,
            'mode': self.mode,
            'page_id': self.page_id,
            'material_id': self.material_id,
            'version_number': self.version_number,
            'is_current': self.is_current,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<MaterialImageVersion {self.project_id}:{self.mode}:{self.page_id} v{self.version_number}>'


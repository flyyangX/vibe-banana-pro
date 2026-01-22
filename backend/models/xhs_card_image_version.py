"""
XhsCardImageVersion model - stores XHS card image versions
"""
import uuid
from datetime import datetime
from . import db


class XhsCardImageVersion(db.Model):
    """
    XHS card image version model - tracks versions per project and card index
    """
    __tablename__ = 'xhs_card_image_versions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=False)
    index = db.Column(db.Integer, nullable=False)
    material_id = db.Column(db.String(36), db.ForeignKey('materials.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    is_current = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    material = db.relationship('Material')

    def to_dict(self):
        return {
            'version_id': self.id,
            'project_id': self.project_id,
            'index': self.index,
            'material_id': self.material_id,
            'version_number': self.version_number,
            'is_current': self.is_current,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<XhsCardImageVersion {self.project_id}:{self.index} v{self.version_number}>'

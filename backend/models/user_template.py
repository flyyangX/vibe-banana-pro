"""
User Template model - stores user-uploaded templates
"""
import uuid
import json
from datetime import datetime
from . import db


class UserTemplate(db.Model):
    """
    User Template model - represents a user-uploaded template
    """
    __tablename__ = 'user_templates'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=True)  # Optional template name
    file_path = db.Column(db.String(500), nullable=False)
    thumb_path = db.Column(db.String(500), nullable=True)  # Thumbnail path for faster loading
    file_size = db.Column(db.Integer, nullable=True)  # File size in bytes
    product_tags = db.Column(db.Text, nullable=True, default='["universal"]')  # JSON array
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_product_tags(self):
        if not self.product_tags:
            return ["universal"]
        try:
            data = json.loads(self.product_tags)
            if isinstance(data, list) and data:
                return [str(tag) for tag in data if str(tag).strip()]
        except Exception:
            pass
        return ["universal"]

    def to_dict(self):
        """Convert to dictionary"""
        # Use thumbnail for preview if available
        if self.thumb_path:
            thumb_url = f'/files/user-templates/{self.id}/{self.thumb_path.split("/")[-1]}'
        else:
            thumb_url = None

        return {
            'template_id': self.id,
            'name': self.name,
            'template_image_url': f'/files/user-templates/{self.id}/{self.file_path.split("/")[-1]}',
            'thumb_url': thumb_url,
            'product_tags': self.get_product_tags(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<UserTemplate {self.id}: {self.name or "Unnamed"}>'


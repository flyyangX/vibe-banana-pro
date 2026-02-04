"""
OpenAI SDK implementation for text generation
"""
import logging
import base64
import io
from pathlib import Path
from typing import List, Optional

from PIL import Image
from openai import OpenAI
from .base import TextProvider
from config import get_config

logger = logging.getLogger(__name__)

def _image_path_to_data_url(image_path: str) -> str:
    """
    Convert a local image file to a data URL that OpenAI Chat API can accept.
    - For HEIC/unknown formats, decode via PIL and re-encode as JPEG.
    """
    p = Path(image_path)
    if not p.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")

    suffix = p.suffix.lower().lstrip(".")
    mime = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif",
    }.get(suffix)

    # Normalize & downscale to reduce payload size (avoid request limits).
    # For common formats we still decode+re-encode because raw bytes can be huge.
    with Image.open(str(p)) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")
        try:
            max_side = 1024
            if img.width > max_side or img.height > max_side:
                img.thumbnail((max_side, max_side))
        except Exception:
            pass
        buf = io.BytesIO()
        # Prefer JPEG for size unless original is GIF (keep GIF as-is is not supported reliably)
        img.save(buf, format="JPEG", quality=90, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"

    # Otherwise, decode and normalize then send as JPEG.
    with Image.open(str(p)) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"


class OpenAITextProvider(TextProvider):
    """Text generation using OpenAI SDK (compatible with Gemini via proxy)"""
    
    def __init__(self, api_key: str, api_base: str = None, model: str = "gemini-3-flash-preview"):
        """
        Initialize OpenAI text provider
        
        Args:
            api_key: API key
            api_base: API base URL (e.g., https://aihubmix.com/v1)
            model: Model name to use
        """
        self.client = OpenAI(
            api_key=api_key,
            base_url=api_base,
            timeout=get_config().OPENAI_TIMEOUT,  # set timeout from config
            max_retries=get_config().OPENAI_MAX_RETRIES  # set max retries from config
        )
        self.model = model
    
    def generate_text(self, prompt: str, thinking_budget: int = 0) -> str:
        """
        Generate text using OpenAI SDK
        
        Args:
            prompt: The input prompt
            thinking_budget: Not used in OpenAI format, kept for interface compatibility (0 = default)
            
        Returns:
            Generated text
        """
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content

    def generate_with_image(self, prompt: str, image_path: str, thinking_budget: int = 0) -> str:
        """
        Generate text with a single image input using OpenAI Chat Completions format.
        """
        return self.generate_text_with_images(prompt=prompt, images=[image_path], thinking_budget=thinking_budget)

    def generate_text_with_images(self, prompt: str, images: List[str], thinking_budget: int = 0) -> str:
        """
        Generate text with multiple image inputs using OpenAI Chat Completions format.
        """
        image_parts = []
        for img_path in images or []:
            try:
                data_url = _image_path_to_data_url(img_path)
            except Exception as e:
                logger.warning(f"Failed to load image for multimodal prompt: {img_path}. {str(e)}")
                continue
            image_parts.append({"type": "image_url", "image_url": {"url": data_url}})

        # If no valid images, fall back to text-only.
        if not image_parts:
            return self.generate_text(prompt, thinking_budget=thinking_budget)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        *image_parts,
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        return response.choices[0].message.content

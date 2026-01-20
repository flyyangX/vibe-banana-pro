"""
Google GenAI SDK implementation for image generation

Supports two modes:
- Google AI Studio: Uses API key authentication
- Vertex AI: Uses GCP service account authentication
"""
import logging
from typing import Optional, List
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
from tenacity import retry, stop_after_attempt, wait_exponential
from .base import ImageProvider
from config import get_config

logger = logging.getLogger(__name__)


class GenAIImageProvider(ImageProvider):
    """Image generation using Google GenAI SDK (supports both AI Studio and Vertex AI)"""

    def __init__(
        self,
        api_key: str = None,
        api_base: str = None,
        model: str = "gemini-3-pro-image-preview",
        vertexai: bool = False,
        project_id: str = None,
        location: str = None
    ):
        """
        Initialize GenAI image provider

        Args:
            api_key: Google API key (for AI Studio mode)
            api_base: API base URL (for proxies like aihubmix, AI Studio mode only)
            model: Model name to use
            vertexai: If True, use Vertex AI instead of AI Studio
            project_id: GCP project ID (required for Vertex AI mode)
            location: GCP region (for Vertex AI mode, default: us-central1)
        """
        timeout_ms = int(get_config().GENAI_TIMEOUT * 1000)

        if vertexai:
            # Vertex AI mode - uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS
            logger.info(f"Initializing GenAI image provider in Vertex AI mode, project: {project_id}, location: {location}")
            self.client = genai.Client(
                vertexai=True,
                project=project_id,
                location=location or 'us-central1',
                http_options=types.HttpOptions(timeout=timeout_ms)
            )
        else:
            # AI Studio mode - uses API key
            http_options = types.HttpOptions(
                base_url=api_base,
                timeout=timeout_ms
            ) if api_base else types.HttpOptions(timeout=timeout_ms)

            self.client = genai.Client(
                http_options=http_options,
                api_key=api_key
            )

        self.model = model

    @retry(
        stop=stop_after_attempt(get_config().GENAI_MAX_RETRIES + 1),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K",
        enable_thinking: bool = True,
        thinking_budget: int = 1024
    ) -> Optional[Image.Image]:
        """
        Generate image using Google GenAI SDK
        
        Args:
            prompt: The image generation prompt
            ref_images: Optional list of reference images
            aspect_ratio: Image aspect ratio
            resolution: Image resolution (supports "1K", "2K", "4K")
            enable_thinking: If True, enable thinking chain mode (may generate multiple images)
            thinking_budget: Thinking budget for the model
            
        Returns:
            Generated PIL Image object, or None if failed
        """
        try:
            # Build contents list with prompt and reference images
            contents = []
            
            # Add reference images first (if any)
            if ref_images:
                for ref_img in ref_images:
                    contents.append(ref_img)
            
            # Add text prompt
            contents.append(prompt)
            
            logger.debug(f"Calling GenAI API for image generation with {len(ref_images) if ref_images else 0} reference images...")
            logger.debug(f"Config - aspect_ratio: {aspect_ratio}, resolution: {resolution}, enable_thinking: {enable_thinking}")
            
            # Build config
            config_params = {
                'response_modalities': ['TEXT', 'IMAGE'],
                'image_config': types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=resolution
                )
            }
            
            # Add thinking config if enabled
            if enable_thinking:
                # In Vertex AI (Gemini) Thinking mode, enabling include_thoughts=True requires explicitly setting thinking_budget
                config_params['thinking_config'] = types.ThinkingConfig(  
                    thinking_budget=thinking_budget, 
                    include_thoughts=True  
                )
            
            # Check if using GRSAI proxy - use stream mode for compatibility
            api_base_str = str(self.client.client_config.http_options.api_endpoint) if hasattr(self.client, 'client_config') else ''
            is_grsai = 'grsai' in api_base_str.lower()
            
            if is_grsai:
                logger.info("Detected GRSAI proxy - using stream mode for Gemini-compatible endpoint")
                # Use stream mode for GRSAI
                response_stream = self.client.models.generate_content_stream(
                    model=self.model,
                    contents=contents,
                    config=types.GenerateContentConfig(**config_params)
                )
                # Collect all chunks
                response = None
                for chunk in response_stream:
                    response = chunk  # Last chunk has complete response
                logger.debug("GenAI API stream call completed")
            else:
                # Use regular mode for official Gemini API
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=types.GenerateContentConfig(**config_params)
                )
                logger.debug("GenAI API call completed")
            
            # Check if response.parts is None (GRSAI proxy may return None)
            if response.parts is None:
                logger.error("Response.parts is None - GRSAI proxy returned non-standard response")
                logger.error(f"Response type: {type(response)}")
                # Try to get candidates
                if hasattr(response, 'candidates'):
                    logger.error(f"Response.candidates: {response.candidates}")
                    if response.candidates:
                        logger.error(f"First candidate: {response.candidates[0]}")
                        if hasattr(response.candidates[0], 'content'):
                            logger.error(f"Candidate content: {response.candidates[0].content}")
                            if hasattr(response.candidates[0].content, 'parts'):
                                logger.error(f"Candidate content parts: {response.candidates[0].content.parts}")
                # Try to get JSON representation
                try:
                    json_dict = response.to_json_dict()
                    logger.error(f"Response JSON: {json_dict}")
                except Exception as e:
                    logger.error(f"Failed to get JSON dict: {e}")
                raise ValueError("GRSAI API returned response with None parts - incompatible with Gemini SDK format")
            
            # Extract the final image from the response.
            # Earlier images are usually low resolution drafts 
            # Therefore, always use the last image found.
            last_image = None
            
            for i, part in enumerate(response.parts):
                if part.text is not None:
                    logger.debug(f"Part {i}: TEXT - {part.text[:100] if len(part.text) > 100 else part.text}")
                else:
                    try:
                        logger.debug(f"Part {i}: Attempting to extract image...")
                        image = part.as_image()
                        if image:
                            # as_image() should return PIL Image directly (official SDK)
                            # But proxy may return custom Image object, so we need fallbacks
                            if isinstance(image, Image.Image):
                                last_image = image
                            elif hasattr(image, 'image_bytes') and image.image_bytes:
                                last_image = Image.open(BytesIO(image.image_bytes))
                            elif hasattr(image, '_pil_image') and image._pil_image:
                                last_image = image._pil_image
                            else:
                                logger.warning(f"Part {i}: Image object type {type(image)} has no usable conversion method")
                                continue
                            logger.debug(f"Successfully extracted image from part {i}")
                    except Exception as e:
                        logger.warning(f"Part {i}: Failed to extract image - {type(e).__name__}: {str(e)}")
            
            # Return the last image found (highest quality in thinking chain scenarios)
            if last_image:
                return last_image
            
            # No image found in response
            error_msg = "No image found in API response. "
            if response.parts:
                error_msg += f"Response had {len(response.parts)} parts but none contained valid images."
            else:
                error_msg += "Response had no parts."
            
            raise ValueError(error_msg)
            
        except Exception as e:
            error_detail = f"Error generating image with GenAI: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e

"""
AI Providers factory module

Provides factory functions to get the appropriate text/image generation providers
based on environment configuration.

Configuration Priority (highest to lowest):
    1. Database settings (via Flask app.config)
    2. Environment variables (.env file)
    3. Default values

Environment Variables:
    AI_PROVIDER_FORMAT: "gemini" (default), "openai", or "vertex"

    For Gemini format (Google GenAI SDK):
        GOOGLE_API_KEY: API key
        GOOGLE_API_BASE: API base URL (e.g., https://aihubmix.com/gemini)

    For OpenAI format:
        OPENAI_API_KEY: API key
        OPENAI_API_BASE: API base URL (e.g., https://aihubmix.com/v1)

    For Vertex AI format (Google Cloud):
        VERTEX_PROJECT_ID: GCP project ID
        VERTEX_LOCATION: GCP region (default: us-central1)
        GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON file
"""
import os
import logging
from typing import Dict, Any

from .text import TextProvider, GenAITextProvider, OpenAITextProvider
from .image import ImageProvider, GenAIImageProvider, OpenAIImageProvider

logger = logging.getLogger(__name__)

__all__ = [
    'TextProvider', 'GenAITextProvider', 'OpenAITextProvider',
    'ImageProvider', 'GenAIImageProvider', 'OpenAIImageProvider',
    'get_text_provider', 'get_image_provider', 'get_provider_format'
]


def get_provider_format() -> str:
    """
    Get the configured AI provider format

    Priority:
        1. Flask app.config['AI_PROVIDER_FORMAT'] (from database settings)
        2. Environment variable AI_PROVIDER_FORMAT
        3. Default: 'gemini'

    Returns:
        "gemini", "openai", or "vertex"
    """
    # Try to get from Flask app config first (database settings)
    try:
        from flask import current_app
        if current_app and hasattr(current_app, 'config'):
            config_value = current_app.config.get('AI_PROVIDER_FORMAT')
            if config_value:
                return str(config_value).lower()
    except RuntimeError:
        # Not in Flask application context
        pass
    
    # Fallback to environment variable
    return os.getenv('AI_PROVIDER_FORMAT', 'gemini').lower()


def _get_config_value(key: str, default: str = None) -> str:
    """
    Helper to get config value with priority: app.config > env var > default
    """
    try:
        from flask import current_app
        if current_app and hasattr(current_app, 'config'):
            # Check if key exists in config (even if value is empty string)
            # This allows database settings to override env vars even with empty values
            if key in current_app.config:
                config_value = current_app.config.get(key)
                # Return the value even if it's empty string (user explicitly set it)
                if config_value is not None:
                    logger.debug(f"[CONFIG] Using {key} from app.config")
                    return str(config_value)
            else:
                logger.debug(f"[CONFIG] Key {key} not found in app.config, checking env var")
    except RuntimeError as e:
        # Not in Flask application context, fallback to env var
        logger.debug(f"[CONFIG] Not in Flask context for {key}: {e}")
    # Fallback to environment variable or default
    env_value = os.getenv(key)
    if env_value is not None:
        logger.debug(f"[CONFIG] Using {key} from environment")
        return env_value
    if default is not None:
        logger.debug(f"[CONFIG] Using {key} default: {default}")
        return default
    logger.debug(f"[CONFIG] No value found for {key}, returning None")
    return None


def _get_provider_config() -> Dict[str, Any]:
    """
    Get provider configuration based on AI_PROVIDER_FORMAT

    Priority for API keys/base URLs:
        1. Flask app.config (from database settings)
        2. Environment variables
        3. Default values

    Returns:
        Dict with keys:
            - format: "gemini", "openai", or "vertex"
            - For gemini/openai: api_key, api_base
            - For vertex: project_id, location

    Raises:
        ValueError: If required configuration is not set
    """
    provider_format = get_provider_format()

    if provider_format == 'vertex':
        # Vertex AI format
        project_id = _get_config_value('VERTEX_PROJECT_ID')
        location = _get_config_value('VERTEX_LOCATION', 'us-central1')

        if not project_id:
            raise ValueError(
                "VERTEX_PROJECT_ID is required when AI_PROVIDER_FORMAT=vertex. "
                "Also ensure GOOGLE_APPLICATION_CREDENTIALS is set to point to your service account JSON file."
            )

        logger.info(f"Provider config - format: vertex, project: {project_id}, location: {location}")

        return {
            'format': 'vertex',
            'project_id': project_id,
            'location': location,
        }

    elif provider_format == 'openai':
        api_key = _get_config_value('OPENAI_API_KEY') or _get_config_value('GOOGLE_API_KEY')
        api_base = _get_config_value('OPENAI_API_BASE', 'https://aihubmix.com/v1')

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY or GOOGLE_API_KEY (from database settings or environment) is required when AI_PROVIDER_FORMAT=openai."
            )

        logger.info(f"Provider config - format: openai, api_base: {api_base}")

        return {
            'format': 'openai',
            'api_key': api_key,
            'api_base': api_base,
        }

    else:
        # Gemini format (default)
        api_key = _get_config_value('GOOGLE_API_KEY')
        api_base = _get_config_value('GOOGLE_API_BASE')

        logger.info(f"Provider config - format: gemini, api_base: {api_base}, api_key: {'***' if api_key else 'None'}")

        if not api_key:
            raise ValueError("GOOGLE_API_KEY (from database settings or environment) is required")

        return {
            'format': 'gemini',
            'api_key': api_key,
            'api_base': api_base,
        }


def get_text_provider(model: str = "gemini-3-flash-preview") -> TextProvider:
    """
    Factory function to get text generation provider based on configuration

    Args:
        model: Model name to use

    Returns:
        TextProvider instance (GenAITextProvider or OpenAITextProvider)
    
    Note:
        For GRSAI proxy, always use OpenAI format for text generation
        to avoid Pydantic validation errors with Gemini SDK
    """
    config = _get_provider_config()
    provider_format = config['format']

    # Debug logging
    api_base_value = config.get('api_base')
    logger.info(f"get_text_provider: provider_format={provider_format}, api_base={api_base_value}, contains_grsai={'grsai' in (api_base_value or '').lower()}")
    
    # Force OpenAI format for GRSAI models to use Chat API
    api_base_str = (api_base_value or '')
    if provider_format == 'gemini' and 'grsai' in api_base_str.lower():
        logger.info(f"Detected GRSAI proxy - forcing OpenAI format for text generation, model: {model}")
        # Use OpenAI Chat API endpoint for GRSAI
        api_base = config['api_base'].replace('/v1beta', '/v1')  # Ensure /v1 for Chat API
        if not api_base.endswith('/v1'):
            api_base = api_base.rstrip('/') + '/v1'
        return OpenAITextProvider(api_key=config['api_key'], api_base=api_base, model=model)
    elif provider_format == 'openai':
        logger.info(f"Using OpenAI format for text generation, model: {model}")
        return OpenAITextProvider(api_key=config['api_key'], api_base=config['api_base'], model=model)
    elif provider_format == 'vertex':
        logger.info(f"Using Vertex AI for text generation, model: {model}, project: {config['project_id']}")
        return GenAITextProvider(
            model=model,
            vertexai=True,
            project_id=config['project_id'],
            location=config['location']
        )
    else:
        logger.info(f"Using Gemini format for text generation, model: {model}")
        return GenAITextProvider(api_key=config['api_key'], api_base=config['api_base'], model=model)


def get_image_provider(model: str = "gemini-3-pro-image-preview") -> ImageProvider:
    """
    Factory function to get image generation provider based on configuration

    Args:
        model: Model name to use

    Returns:
        ImageProvider instance (GRSAIImageProvider, GenAIImageProvider, or OpenAIImageProvider)

    Note:
        OpenAI format does NOT support 4K resolution, only 1K is available.
        If you need higher resolution images, use Gemini or Vertex AI format.
        
        When using GRSAI proxy with nano-banana models, GRSAIImageProvider is automatically used
        for better compatibility.
    """
    config = _get_provider_config()
    provider_format = config['format']
    
    # Check if using GRSAI proxy with nano-banana models
    # Use dedicated GRSAI draw API for better compatibility
    api_base_str = (config.get('api_base') or '')
    is_grsai_proxy = 'grsai' in api_base_str.lower()
    is_nano_banana = model and 'nano-banana' in model.lower()
    
    if is_grsai_proxy and is_nano_banana:
        # Use dedicated GRSAI provider for nano-banana models
        from .image.grsai_provider import GRSAIImageProvider
        logger.info(f"Detected GRSAI proxy with nano-banana model - using GRSAIImageProvider, model: {model}")
        return GRSAIImageProvider(api_key=config['api_key'], api_base=api_base_str, model=model)

    if provider_format == 'openai':
        logger.info(f"Using OpenAI format for image generation, model: {model}")
        logger.warning("OpenAI format only supports 1K resolution, 4K is not available")
        return OpenAIImageProvider(api_key=config['api_key'], api_base=config['api_base'], model=model)
    elif provider_format == 'vertex':
        logger.info(f"Using Vertex AI for image generation, model: {model}, project: {config['project_id']}")
        return GenAIImageProvider(
            model=model,
            vertexai=True,
            project_id=config['project_id'],
            location=config['location']
        )
    else:
        logger.info(f"Using Gemini format for image generation, model: {model}")
        return GenAIImageProvider(api_key=config['api_key'], api_base=config['api_base'], model=model)

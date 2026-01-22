"""
AIService singleton manager for optimizing provider initialization

This module provides a singleton pattern implementation for AIService to avoid
repeated initialization of AI providers (TextProvider and ImageProvider) on every request.

Benefits:
- Reuses AI provider instances across requests
- Reduces initialization overhead
- Better resource management
- Thread-safe for Flask multi-threaded environment

Usage:
    from services.ai_service_manager import get_ai_service
    
    # In your controller
    ai_service = get_ai_service()
    outline = ai_service.generate_outline(project_context)
"""

import logging
from threading import Lock
from typing import Optional, Callable, Dict, Any
import time
import hashlib
from flask import current_app, has_app_context
from .ai_service import AIService
from .ai_providers import get_text_provider, get_image_provider, TextProvider, ImageProvider

logger = logging.getLogger(__name__)

# Global singleton instance
_ai_service_instance: Optional[AIService] = None
_lock = Lock()

# Provider cache to avoid re-initialization when models don't change
_text_provider_cache: dict = {}
_image_provider_cache: dict = {}
_cache_lock = Lock()

# Refined template_style cache (per project) to avoid per-page re-generation
_refined_style_cache: Dict[str, Dict[str, Any]] = {}
_refined_style_lock = Lock()
_REFINED_STYLE_TTL_SECONDS = 15 * 60  # 15 minutes


def get_cached_refined_template_style(
    project_id: str,
    base_style: str,
    outline_text: str,
    extra_requirements: str,
    language: str,
    generate_fn: Callable[[], str],
) -> str:
    """
    Cache a refined template style for a short period to keep style consistent across
    "batch generation" that is implemented as per-page requests on the frontend.

    - Does NOT persist to DB (so it won't overwrite user-provided template_style)
    - Ensures only the first page triggers the refinement call; subsequent pages reuse it
    """
    base_style_str = (base_style or "").strip()
    if not base_style_str:
        return ""

    # Build a stable cache key that changes when inputs change
    fingerprint_src = "\n".join(
        [
            base_style_str,
            (extra_requirements or "").strip(),
            (outline_text or "").strip(),
            (language or "").strip(),
        ]
    ).encode("utf-8")
    fingerprint = hashlib.sha1(fingerprint_src).hexdigest()
    cache_key = f"{project_id}:{fingerprint}"
    now = time.time()

    cached = _refined_style_cache.get(cache_key)
    if cached and (now - float(cached.get("ts", 0))) < _REFINED_STYLE_TTL_SECONDS:
        return str(cached.get("style", "")).strip() or base_style_str

    with _refined_style_lock:
        cached = _refined_style_cache.get(cache_key)
        if cached and (now - float(cached.get("ts", 0))) < _REFINED_STYLE_TTL_SECONDS:
            return str(cached.get("style", "")).strip() or base_style_str

        try:
            refined = (generate_fn() or "").strip()
        except Exception:
            logger.exception("Failed to refine template style; falling back to base style")
            refined = ""

        effective = refined or base_style_str
        _refined_style_cache[cache_key] = {"ts": now, "style": effective}

        # Best-effort cleanup: drop expired entries for this project
        try:
            expired_keys = []
            for k, v in _refined_style_cache.items():
                if not k.startswith(f"{project_id}:"):
                    continue
                ts = float(v.get("ts", 0))
                if (now - ts) >= _REFINED_STYLE_TTL_SECONDS:
                    expired_keys.append(k)
            for k in expired_keys:
                _refined_style_cache.pop(k, None)
        except Exception:
            # never fail the request due to cleanup
            pass

        return effective


def _get_cached_text_provider(model: str) -> TextProvider:
    """
    Get or create a cached text provider instance
    
    Args:
        model: Model name to use
        
    Returns:
        Cached or new TextProvider instance
    """
    with _cache_lock:
        if model not in _text_provider_cache:
            logger.info(f"Creating new TextProvider for model: {model}")
            _text_provider_cache[model] = get_text_provider(model=model)
        else:
            logger.debug(f"Reusing cached TextProvider for model: {model}")
        return _text_provider_cache[model]


def _get_cached_image_provider(model: str) -> ImageProvider:
    """
    Get or create a cached image provider instance
    
    Args:
        model: Model name to use
        
    Returns:
        Cached or new ImageProvider instance
    """
    with _cache_lock:
        if model not in _image_provider_cache:
            logger.info(f"Creating new ImageProvider for model: {model}")
            _image_provider_cache[model] = get_image_provider(model=model)
        else:
            logger.debug(f"Reusing cached ImageProvider for model: {model}")
        return _image_provider_cache[model]


def get_ai_service(force_new: bool = False) -> AIService:
    """
    Get the singleton AIService instance with optimized provider caching
    
    This function creates and returns a singleton AIService instance that reuses
    AI providers (TextProvider and ImageProvider) across requests, significantly
    reducing initialization overhead.
    
    Args:
        force_new: If True, forces creation of a new instance (useful for testing)
        
    Returns:
        AIService singleton instance with cached providers
        
    Note:
        The providers are cached per model name. If TEXT_MODEL or IMAGE_MODEL
        changes in Flask config, new providers will be created automatically.
    """
    global _ai_service_instance
    
    if force_new:
        with _lock:
            logger.info("Force creating new AIService instance")
            _ai_service_instance = None
    
    if _ai_service_instance is None:
        with _lock:
            # Double-check locking pattern
            if _ai_service_instance is None:
                logger.info("Initializing AIService singleton with provider caching")
                
                # Get model names from Flask config or use defaults
                from config import get_config
                config = get_config()
                
                if has_app_context() and current_app and hasattr(current_app, "config"):
                    text_model = current_app.config.get("TEXT_MODEL", config.TEXT_MODEL)
                    image_model = current_app.config.get("IMAGE_MODEL", config.IMAGE_MODEL)
                else:
                    text_model = config.TEXT_MODEL
                    image_model = config.IMAGE_MODEL
                
                # Get cached providers
                text_provider = _get_cached_text_provider(text_model)
                image_provider = _get_cached_image_provider(image_model)
                
                # Create AIService with cached providers
                _ai_service_instance = AIService(
                    text_provider=text_provider,
                    image_provider=image_provider
                )
                
                logger.info(f"AIService singleton created with models: text={text_model}, image={image_model}")
    
    return _ai_service_instance


def clear_ai_service_cache():
    """
    Clear the AIService singleton and provider cache
    
    This is useful when:
    - Configuration changes (API keys, endpoints, models)
    - Testing scenarios requiring fresh instances
    - Memory cleanup needed
    
    Note:
    - Uses nested locks to ensure atomic cache clearing operation
    - Prevents race conditions where new instances could be created
      with stale cached providers during the clearing process
    """
    global _ai_service_instance
    
    with _lock:
        _ai_service_instance = None
        logger.info("AIService singleton cache cleared")
        with _cache_lock:
            _text_provider_cache.clear()
            _image_provider_cache.clear()
            logger.info("Provider cache cleared")


def get_provider_cache_info() -> dict:
    """
    Get information about cached providers (for debugging/monitoring)
    
    Returns:
        Dictionary with cache statistics
    """
    with _cache_lock:
        return {
            "text_providers": list(_text_provider_cache.keys()),
            "image_providers": list(_image_provider_cache.keys()),
            "total_cached": len(_text_provider_cache) + len(_image_provider_cache)
        }

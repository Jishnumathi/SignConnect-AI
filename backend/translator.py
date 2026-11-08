from backend.services.translation_service import TranslationService

def translate_text(text, target_lang):
    """Legacy backward-compatible proxy method."""
    return TranslationService.translate_text(text, target_lang)

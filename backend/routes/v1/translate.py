from flask import Blueprint, request, jsonify
from backend.services.translation_service import TranslationService

translate_v1_bp = Blueprint("translate_v1", __name__)

@translate_v1_bp.route("", methods=["POST"])
@translate_v1_bp.route("/", methods=["POST"])
def translate_text():
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    language = data.get("language", "en").strip()

    if not text:
        return jsonify({"error": "Text to translate is required"}), 400

    translated = TranslationService.translate_text(text, language)
    
    return jsonify({
        "original_text": text,
        "translated_text": translated,
        "language": language
    }), 200

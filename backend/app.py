import os
import sys
import hashlib
import logging

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, request, jsonify, session
from flask_cors import CORS

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

# Add root folder to path to allow database module import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db_client import db_client
from backend.model_loader import model_loader
from backend.translator import translate_text

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "signconnect_super_secret_key_12345")
CORS(app, supports_credentials=True)

# Helper function to hash password
def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def get_current_user_id():
    """Retrieves current user ID from headers or session."""
    user_id = request.headers.get("x-user-id")
    if not user_id:
        user_id = session.get("user_id")
    return user_id

# AUTHENTICATION ENDPOINTS
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400

    password_hash = hash_password(password)
    user_id = db_client.create_user(name, email, password_hash)

    if not user_id:
        return jsonify({"error": "User with this email already exists"}), 409

    return jsonify({
        "message": "User registered successfully",
        "user_id": user_id,
        "name": name,
        "email": email
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = db_client.get_user_by_email(email)
    if not user or user["password"] != hash_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["user_id"]
    
    return jsonify({
        "message": "Login successful",
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"]
    }), 200

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logout successful"}), 200

@app.route("/api/auth/profile", methods=["GET"])
def profile():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = db_client.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"]
    }), 200

@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    new_password = data.get("new_password", "")

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required"}), 400

    user = db_client.get_user_by_email(email)
    if not user:
        return jsonify({"error": "User with this email does not exist"}), 404

    # Update password
    password_hash = hash_password(new_password)
    success = db_client.update_user_password(email, password_hash)
    if not success:
        return jsonify({"error": "Failed to update password"}), 500

    return jsonify({"message": "Password reset successful"}), 200


# TRANSLATION & AI ENDPOINTS
@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json() or {}
    landmarks = data.get("landmarks")
    
    if not landmarks or not isinstance(landmarks, list) or len(landmarks) == 0:
        return jsonify({"error": "Landmarks coordinates list is required"}), 400

    gesture, confidence = model_loader.predict(landmarks)
    
    return jsonify({
        "gesture": gesture,
        "confidence": confidence
    }), 200

@app.route("/api/translate", methods=["POST"])
def translate():
    data = request.get_json() or {}
    text = data.get("text")
    language = data.get("language", "en") # target language code

    if not text:
        return jsonify({"error": "Text to translate is required"}), 400

    translated = translate_text(text, language)
    
    return jsonify({
        "original_text": text,
        "translated_text": translated,
        "language": language
    }), 200


# HISTORY & ANALYTICS ENDPOINTS
@app.route("/api/history", methods=["GET", "POST"])
def history():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "POST":
        data = request.get_json() or {}
        detected_text = data.get("detected_text")
        translated_text = data.get("translated_text")
        language = data.get("language")

        if not detected_text or not translated_text or not language:
            return jsonify({"error": "Missing fields"}), 400

        record = db_client.add_translation(user_id, detected_text, translated_text, language)
        if not record:
            return jsonify({"error": "Failed to save translation record"}), 500
        return jsonify(record), 201

    else:
        # GET request
        limit = request.args.get("limit", default=50, type=int)
        user_history = db_client.get_translation_history(user_id, limit=limit)
        return jsonify(user_history), 200

@app.route("/api/analytics", methods=["GET"])
def analytics():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    stats = db_client.get_analytics(user_id)
    return jsonify(stats), 200

# Register modular v1 blueprints
try:
    from backend.routes.v1.auth import auth_v1_bp
    from backend.routes.v1.predict import predict_v1_bp
    from backend.routes.v1.translate import translate_v1_bp
    app.register_blueprint(auth_v1_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(predict_v1_bp, url_prefix="/api/v1/predict")
    app.register_blueprint(translate_v1_bp, url_prefix="/api/v1/translate")
except Exception as e:
    logger.warning(f"Could not register v1 blueprints: {e}")

# Health check
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "database": "mongodb" if db_client.use_mongo else "sqlite_fallback",
        "model_loaded": model_loader.model is not None
    }), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    logger.info(f"Starting server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)

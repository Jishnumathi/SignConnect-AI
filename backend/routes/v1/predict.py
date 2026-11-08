from flask import Blueprint, request, jsonify
from backend.services.ml_service import ml_service

predict_v1_bp = Blueprint("predict_v1", __name__)

@predict_v1_bp.route("", methods=["POST"])
@predict_v1_bp.route("/", methods=["POST"])
def predict():
    data = request.get_json() or {}
    landmarks = data.get("landmarks")
    
    if not landmarks:
        return jsonify({"error": "Landmarks coordinates list is required"}), 400

    gesture, confidence, model_version = ml_service.predict(landmarks)
    
    return jsonify({
        "gesture": gesture,
        "confidence": confidence,
        "model_version": model_version
    }), 200

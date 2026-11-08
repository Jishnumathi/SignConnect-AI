from flask import Blueprint, request, jsonify, session
from backend.services.auth_service import AuthService
from backend.services.db_service import db_service

auth_v1_bp = Blueprint("auth_v1", __name__)

@auth_v1_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400

    # Validation Checks
    if not AuthService.validate_email(email):
        return jsonify({"error": "Invalid email address format"}), 400

    is_strong, err_msg = AuthService.validate_password_strength(password)
    if not is_strong:
        return jsonify({"error": err_msg}), 400

    password_hash = AuthService.hash_password(password)
    user_id = db_service.create_user(name, email, password_hash)

    if not user_id:
        return jsonify({"error": "An account with this email already exists"}), 409

    return jsonify({
        "message": "User registered successfully",
        "user_id": user_id,
        "name": name,
        "email": email
    }), 201

@auth_v1_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = db_service.get_user_by_email(email)
    if not user or not AuthService.verify_password(password, user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["user_id"]
    
    return jsonify({
        "message": "Login successful",
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"]
    }), 200

@auth_v1_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logout successful"}), 200

@auth_v1_bp.route("/profile", methods=["GET"])
def profile():
    user_id = request.headers.get("x-user-id") or session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized session"}), 401

    user = db_service.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User profile not found"}), 404

    return jsonify({
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"]
    }), 200

@auth_v1_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    new_password = data.get("new_password", "")

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required"}), 400

    user = db_service.get_user_by_email(email)
    if not user:
        return jsonify({"error": "No user registered with this email"}), 404

    is_strong, err_msg = AuthService.validate_password_strength(new_password)
    if not is_strong:
        return jsonify({"error": err_msg}), 400

    # Update password in DB
    password_hash = AuthService.hash_password(new_password)
    success = db_service.update_user_password(email, password_hash)
    if not success:
        return jsonify({"error": "Failed to update password"}), 500

    return jsonify({"message": "Password reset successfully"}), 200

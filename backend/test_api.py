import os
import sys
import unittest
import json

# Add root folder to path to allow database/backend module import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from database.db_client import db_client

class TestSignConnectAPI(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config["TESTING"] = True
        self.client = app.test_client()
        
        # Ensure SQLite database fallback tables exist in test environment
        db_client.init_sqlite_db()
        
        # Test credentials
        self.name = "Test User"
        self.email = "test@example.com"
        self.password = "password123"
        self.user_id = None

    def test_01_health_check(self):
        """Test the health check endpoint returns 200 and valid JSON."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "healthy")
        self.assertIn("database", data)
        self.assertIn("model_loaded", data)

    def test_02_register_user(self):
        """Test user registration."""
        payload = {
            "name": self.name,
            "email": self.email,
            "password": self.password
        }
        response = self.client.post("/api/auth/register", 
                                    data=json.dumps(payload),
                                    content_type="application/json")
        
        # Either 201 Created or 409 Conflict if already registered from previous run
        self.assertIn(response.status_code, [201, 409])
        
        if response.status_code == 201:
            data = json.loads(response.data)
            self.assertEqual(data["name"], self.name)
            self.assertEqual(data["email"], self.email)
            self.assertIn("user_id", data)

    def test_03_login_user(self):
        """Test login and verification headers."""
        payload = {
            "email": self.email,
            "password": self.password
        }
        response = self.client.post("/api/auth/login", 
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("user_id", data)
        self.assertEqual(data["email"], self.email)
        self.user_id = data["user_id"]

    def test_04_gesture_prediction(self):
        """Test gesture classifier endpoint with valid coordinates mock."""
        # Create a mock of 21 landmarks
        mock_landmarks = []
        for i in range(21):
            mock_landmarks.append({"x": i * 0.01, "y": i * 0.02, "z": i * 0.005})
            
        payload = {"landmarks": mock_landmarks}
        response = self.client.post("/api/predict", 
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("gesture", data)
        self.assertIn("confidence", data)
        self.assertIsInstance(data["confidence"], float)

    def test_05_translation(self):
        """Test Google translate API proxy."""
        # Test translation into Hindi
        payload = {
            "text": "Hello",
            "language": "hi"
        }
        response = self.client.post("/api/translate", 
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["original_text"], "Hello")
        self.assertEqual(data["language"], "hi")
        # Assert fallback or translated text contains something
        self.assertGreater(len(data["translated_text"]), 0)

    def test_06_unauthorized_endpoints(self):
        """Test history and analytics block unauthorized requests."""
        response = self.client.get("/api/history")
        self.assertEqual(response.status_code, 401)
        
        response = self.client.get("/api/analytics")
        self.assertEqual(response.status_code, 401)

    def test_07_authorized_history_and_analytics(self):
        """Test history insertion, loading, and analytics calculations."""
        # Retrieve user first to get valid ID
        user = db_client.get_user_by_email(self.email)
        self.assertIsNotNone(user, "User should exist for authorized analytics test")
        uid = user["user_id"]

        headers = {"x-user-id": uid}
        
        # Test History Post
        history_payload = {
            "detected_text": "Hello Emergency",
            "translated_text": "नमस्ते आपातकाल",
            "language": "Hindi"
        }
        response = self.client.post("/api/history", 
                                    headers=headers,
                                    data=json.dumps(history_payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 201)
        
        # Test History Get
        response = self.client.get("/api/history?limit=10", headers=headers)
        self.assertEqual(response.status_code, 200)
        history_list = json.loads(response.data)
        self.assertIsInstance(history_list, list)
        self.assertGreater(len(history_list), 0)
        self.assertEqual(history_list[0]["detected_text"], "Hello Emergency")

        # Test Analytics Get
        response = self.client.get("/api/analytics", headers=headers)
        self.assertEqual(response.status_code, 200)
        analytics = json.loads(response.data)
        self.assertIn("total_translations", analytics)
        self.assertGreater(analytics["total_translations"], 0)
        self.assertEqual(analytics["most_used_language"], "Hindi")
        self.assertIn("recognition_accuracy", analytics)

    def test_08_password_reset(self):
        """Test reset password endpoint."""
        reset_payload = {
            "email": self.email,
            "new_password": "newpassword123"
        }
        response = self.client.post("/api/auth/reset-password",
                                    data=json.dumps(reset_payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 200)

        # Verify login works with new password
        login_payload = {
            "email": self.email,
            "password": "newpassword123"
        }
        res_login = self.client.post("/api/auth/login",
                                     data=json.dumps(login_payload),
                                     content_type="application/json")
        self.assertEqual(res_login.status_code, 200)

    def test_09_v1_endpoints(self):
        """Test modular v1 API endpoints."""
        mock_landmarks = [{"x": i * 0.01, "y": i * 0.02, "z": 0.0} for i in range(21)]
        res_pred = self.client.post("/api/v1/predict",
                                    data=json.dumps({"landmarks": mock_landmarks}),
                                    content_type="application/json")
        self.assertEqual(res_pred.status_code, 200)
        data_pred = json.loads(res_pred.data)
        self.assertIn("gesture", data_pred)
        self.assertIn("confidence", data_pred)

        res_trans = self.client.post("/api/v1/translate",
                                     data=json.dumps({"text": "Thank you", "language": "te"}),
                                     content_type="application/json")
        self.assertEqual(res_trans.status_code, 200)
        data_trans = json.loads(res_trans.data)
        self.assertIn("translated_text", data_trans)
        self.assertIn("ధన్యవాదాలు", data_trans["translated_text"])

if __name__ == "__main__":
    unittest.main()

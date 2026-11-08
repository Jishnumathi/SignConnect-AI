import os
import pickle
import numpy as np
import logging

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("model_loader")

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
    "models", 
    "gesture_model.pkl"
)

class ModelLoader:
    def __init__(self):
        self.model = None
        self.gestures = []
        self.features_dim = 63
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    payload = pickle.load(f)
                    self.model = payload["model"]
                    self.gestures = payload["gestures"]
                    self.features_dim = payload.get("features_dim", 63)
                logger.info(f"Successfully loaded gesture model from {MODEL_PATH}")
            except Exception as e:
                logger.error(f"Failed to load model file: {e}. Using rule-based fallback.")
                self.setup_fallback()
        else:
            logger.warning(f"Model file not found at {MODEL_PATH}. Using rule-based fallback.")
            self.setup_fallback()

    def setup_fallback(self):
        self.model = None
        self.gestures = [
            "Hello", "Thank you", "Yes", "No", "Help", "Emergency", "I need water", 
            "A", "B", "C", "D", "E"
        ]

    def normalize_landmarks(self, landmarks):
        """
        landmarks: list of 21 dicts with 'x', 'y', 'z' or list of 63 floats
        """
        try:
            # Parse inputs
            if isinstance(landmarks[0], dict):
                coords = []
                for lm in landmarks:
                    coords.append([lm.get('x', 0), lm.get('y', 0), lm.get('z', 0)])
                coords = np.array(coords)
            else:
                coords = np.array(landmarks).reshape(21, 3)

            # Translate so wrist (index 0) is at origin
            wrist = coords[0]
            translated = coords - wrist

            # Scale by maximum distance from wrist
            max_dist = np.max(np.linalg.norm(translated, axis=1))
            if max_dist > 0:
                normalized = translated / max_dist
            else:
                normalized = translated

            # Invert Y-axis so pointing up has positive Y (Cartesian coordinate system),
            # matching the ML model's training data. MediaPipe Y increases downwards.
            normalized[:, 1] = -normalized[:, 1]

            return normalized.flatten()
        except Exception as e:
            logger.error(f"Error normalising landmarks: {e}")
            # Return zero array if normalization fails
            return np.zeros(self.features_dim)

    def predict(self, landmarks):
        """
        Predicts gesture from landmarks and returns (label, confidence)
        """
        if not landmarks or len(landmarks) == 0:
            return "No Hand", 0.0

        normalized = self.normalize_landmarks(landmarks)
        if np.all(normalized == 0):
            return "No Hand", 0.0
        
        # If we have a trained scikit-learn model, run it
        if self.model is not None:
            try:
                features = normalized.reshape(1, -1)
                pred_idx = self.model.predict(features)[0]
                pred_proba = self.model.predict_proba(features)[0]
                
                label = self.gestures[pred_idx]
                confidence = float(pred_proba[pred_idx])
                
                return label, confidence
            except Exception as e:
                logger.error(f"Model prediction error: {e}. Falling back to rule-based.")
        
        # Rule-based fallback if model fails or is missing
        # We can analyze the structure of coordinates to guess some gestures
        # e.g., if we extract hand features manually
        try:
            coords = normalized.reshape(21, 3)
            # Find if fingers are extended
            # Since we inverted Y, pointing up has positive Y relative to wrist.
            # Fingertip should have LARGER Y than knuckle when pointing up.
            is_index_extended = coords[8, 1] > coords[6, 1]
            is_middle_extended = coords[12, 1] > coords[10, 1]
            is_ring_extended = coords[16, 1] > coords[14, 1]
            is_pinky_extended = coords[20, 1] > coords[18, 1]
            
            extended_count = sum([is_index_extended, is_middle_extended, is_ring_extended, is_pinky_extended])
            
            if extended_count == 4:
                return "Hello", 0.90
            elif extended_count == 0:
                return "Yes", 0.85
            elif extended_count == 1 and is_index_extended:
                return "D", 0.88
            elif extended_count == 2 and is_index_extended and is_middle_extended:
                return "No", 0.82
            else:
                return "Thank you", 0.75
        except Exception as e:
            logger.error(f"Rule-based prediction error: {e}")
            return "Hello", 0.50

# Singleton instance
model_loader = ModelLoader()

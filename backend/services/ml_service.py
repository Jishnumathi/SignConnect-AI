import os
import pickle
import numpy as np
import logging
from backend.config import Config

logger = logging.getLogger("ml_service")

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
    "models", 
    "gesture_model.pkl"
)

class MLService:
    _instance = None

    def __new__(cls):
        """Implement Singleton pattern to load the model exactly once."""
        if cls._instance is None:
            cls._instance = super(MLService, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.gestures = []
            cls._instance.features_dim = 63
            cls._instance.model_version = Config.MODEL_VERSION
            cls._instance.min_confidence = Config.PREDICTION_MIN_CONFIDENCE
            cls._instance.load_model()
            cls._instance.init_future_onnx_tflite_hooks()
        return cls._instance

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    payload = pickle.load(f)
                    self.model = payload["model"]
                    self.gestures = payload["gestures"]
                    self.features_dim = payload.get("features_dim", 63)
                logger.info(f"ML Model v{self.model_version} loaded successfully from {MODEL_PATH}")
            except Exception as e:
                logger.error(f"Failed to load model file: {e}. Fallback to rule-based logic.")
                self.setup_fallback()
        else:
            logger.warning(f"Model file not found at {MODEL_PATH}. Fallback to rule-based logic.")
            self.setup_fallback()

    def setup_fallback(self):
        self.model = None
        self.gestures = [
            "Hello", "Thank you", "Yes", "No", "Help", "Emergency", "I need water", 
            "A", "B", "C", "D", "E"
        ]

    def init_future_onnx_tflite_hooks(self):
        """
        Placeholder configuration for future migration to ONNX / TFLite runtime.
        To migrate to ONNX:
          import onnxruntime as ort
          self.ort_session = ort.InferenceSession("models/gesture_model.onnx")
        """
        self.use_onnx = False
        self.use_tflite = False
        logger.info("ONNX/TFLite hooks initialized (inactive). Ready for future drop-in.")

    def normalize_landmarks(self, landmarks):
        """
        Normalizes coordinates to be translation- and scale-invariant.
        landmarks: list of 21 dictionaries {'x', 'y', 'z'} or list of 63 floats
        """
        try:
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

            # Invert Y-axis so pointing up has positive Y (Cartesian coordinate system)
            # MediaPipe screen coordinates use Y-down.
            normalized[:, 1] = -normalized[:, 1]

            return normalized.flatten()
        except Exception as e:
            logger.error(f"Error normalising landmarks: {e}")
            return np.zeros(self.features_dim)

    def predict_onnx_tflite(self, normalized_features):
        """Template method for future ONNX/TFLite prediction logic."""
        if self.use_onnx:
            # inputs = {self.ort_session.get_inputs()[0].name: [normalized_features]}
            # outputs = self.ort_session.run(None, inputs)
            pass
        return None

    def predict(self, landmarks) -> tuple[str, float, str]:
        """
        Predicts gesture from landmarks.
        Returns: (label, confidence, model_version)
        """
        if not landmarks or len(landmarks) == 0:
            return "No Hand", 0.0, self.model_version

        normalized = self.normalize_landmarks(landmarks)
        if np.all(normalized == 0):
            return "No Hand", 0.0, self.model_version
        
        # 1. Check ONNX/TFLite path first
        onnx_result = self.predict_onnx_tflite(normalized)
        if onnx_result is not None:
            label, confidence = onnx_result
            return label, confidence, self.model_version

        # 2. Scikit-learn model path
        if self.model is not None:
            try:
                features = normalized.reshape(1, -1)
                pred_idx = self.model.predict(features)[0]
                pred_proba = self.model.predict_proba(features)[0]
                
                label = self.gestures[pred_idx]
                confidence = float(pred_proba[pred_idx])
                
                # Reject predictions below minimum confidence threshold
                if confidence < self.min_confidence:
                    return "Unknown", confidence, self.model_version
                    
                return label, confidence, self.model_version
            except Exception as e:
                logger.error(f"Scikit-learn model prediction error: {e}. Falling back to rule-based.")
        
        # 3. Rule-based fallback
        try:
            coords = normalized.reshape(21, 3)
            # Fingertip Y > knuckle Y when pointing up in Cartesian coordinate space
            is_index_extended = coords[8, 1] > coords[6, 1]
            is_middle_extended = coords[12, 1] > coords[10, 1]
            is_ring_extended = coords[16, 1] > coords[14, 1]
            is_pinky_extended = coords[20, 1] > coords[18, 1]
            
            extended_count = sum([is_index_extended, is_middle_extended, is_ring_extended, is_pinky_extended])
            
            if extended_count == 4:
                return "Hello", 0.90, self.model_version
            elif extended_count == 0:
                return "Yes", 0.85, self.model_version
            elif extended_count == 1 and is_index_extended:
                return "D", 0.88, self.model_version
            elif extended_count == 2 and is_index_extended and is_middle_extended:
                return "No", 0.82, self.model_version
            else:
                return "Thank you", 0.75, self.model_version
        except Exception as e:
            logger.error(f"Rule-based prediction error: {e}")
            return "Unknown", 0.0, self.model_version

# Singleton service instance
ml_service = MLService()

import os
import pickle
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("train_model")

# Define target gestures
GESTURES = [
    "Hello",
    "Thank you",
    "Yes",
    "No",
    "Help",
    "Emergency",
    "I need water",
    "A",
    "B",
    "C",
    "D",
    "E"
]

def normalize_landmarks(landmarks):
    """
    Normalizes coordinates to be translation- and scale-invariant.
    landmarks: numpy array of shape (21, 3) or flat array of shape (63,)
    """
    coords = np.array(landmarks).reshape(21, 3)
    
    # Translate so wrist (index 0) is at origin (0,0,0)
    wrist = coords[0]
    translated = coords - wrist
    
    # Scale by maximum distance from wrist
    max_dist = np.max(np.linalg.norm(translated, axis=1))
    if max_dist > 0:
        normalized = translated / max_dist
    else:
        normalized = translated
        
    return normalized.flatten()

def generate_simulated_landmarks(gesture, num_samples=150):
    """
    Generates synthetic hand landmark coordinates with noise based on hand geometry.
    """
    samples = []
    
    for _ in range(num_samples):
        # Base template: 21 landmarks with x, y, z
        # Hand points upwards/outwards from wrist (0,0,0)
        coords = np.zeros((21, 3))
        
        # Add random variations to wrist
        coords[0] = np.random.normal(0, 0.05, 3)
        
        # Define finger directions
        # 1-4: thumb, 5-8: index, 9-12: middle, 13-16: ring, 17-20: pinky
        if gesture in ["Hello", "B"]:
            # All fingers extended straight up (y decreasing/negative in standard image coordinates, but let's assume y-up for simulation)
            # We'll simulate y going up (+y)
            # Thumb extended to the side
            coords[1:5, 0] = [-0.1, -0.2, -0.3, -0.4]
            coords[1:5, 1] = [0.1, 0.2, 0.25, 0.3]
            # Index extended up
            coords[5:9, 0] = [-0.1, -0.1, -0.1, -0.1]
            coords[5:9, 1] = [0.2, 0.4, 0.55, 0.7]
            # Middle extended up
            coords[9:13, 0] = [0.0, 0.0, 0.0, 0.0]
            coords[9:13, 1] = [0.22, 0.45, 0.6, 0.75]
            # Ring extended up
            coords[13:17, 0] = [0.1, 0.1, 0.1, 0.1]
            coords[13:17, 1] = [0.2, 0.4, 0.55, 0.7]
            # Pinky extended up
            coords[17:21, 0] = [0.2, 0.2, 0.2, 0.2]
            coords[17:21, 1] = [0.18, 0.35, 0.48, 0.6]
            
        elif gesture in ["Yes", "A", "E"]:
            # Fist gesture: fingers curled down near knuckles
            # Thumb tucked in front of fingers
            coords[1:5, 0] = [0.1, 0.15, 0.12, 0.08]
            coords[1:5, 1] = [0.05, 0.1, 0.12, 0.12]
            # Index curled
            coords[5:9, 0] = [-0.1, -0.12, -0.08, -0.06]
            coords[5:9, 1] = [0.15, 0.2, 0.15, 0.1]
            # Middle curled
            coords[9:13, 0] = [0.0, 0.0, 0.0, 0.0]
            coords[9:13, 1] = [0.16, 0.22, 0.16, 0.11]
            # Ring curled
            coords[13:17, 0] = [0.08, 0.1, 0.08, 0.06]
            coords[13:17, 1] = [0.15, 0.2, 0.15, 0.1]
            # Pinky curled
            coords[17:21, 0] = [0.15, 0.18, 0.15, 0.12]
            coords[17:21, 1] = [0.12, 0.16, 0.12, 0.08]
            
        elif gesture in ["No", "C"]:
            # Curved hand shape like a 'C'
            # Thumb curved left
            coords[1:5, 0] = [-0.15, -0.25, -0.3, -0.32]
            coords[1:5, 1] = [0.1, 0.15, 0.18, 0.18]
            # Fingers curved right/up
            coords[5:9, 0] = [0.05, 0.1, 0.15, 0.12]
            coords[5:9, 1] = [0.2, 0.3, 0.25, 0.18]
            coords[9:13, 0] = [0.08, 0.14, 0.18, 0.14]
            coords[9:13, 1] = [0.22, 0.32, 0.27, 0.2]
            coords[13:17, 0] = [0.1, 0.15, 0.18, 0.14]
            coords[13:17, 1] = [0.2, 0.3, 0.25, 0.18]
            coords[17:21, 0] = [0.12, 0.16, 0.18, 0.14]
            coords[17:21, 1] = [0.18, 0.26, 0.22, 0.16]
            
        elif gesture == "Help":
            # Thumb pointing straight up (+y), other fingers closed tightly
            coords[1:5, 0] = [0.0, 0.0, 0.0, 0.0]
            coords[1:5, 1] = [0.15, 0.3, 0.45, 0.6] # Thumb extended up!
            # Folded fingers
            coords[5:9, 0] = [0.05, 0.08, 0.05, 0.03]
            coords[5:9, 1] = [0.1, 0.15, 0.1, 0.05]
            coords[9:13, 0] = [0.08, 0.1, 0.08, 0.05]
            coords[9:13, 1] = [0.1, 0.15, 0.1, 0.05]
            coords[13:17, 0] = [0.1, 0.12, 0.1, 0.08]
            coords[13:17, 1] = [0.08, 0.12, 0.08, 0.05]
            coords[17:21, 0] = [0.12, 0.14, 0.12, 0.1]
            coords[17:21, 1] = [0.06, 0.1, 0.06, 0.04]
            
        elif gesture == "Emergency":
            # Pinky and thumb extended, index/middle/ring folded (Shaka sign)
            # Thumb extended left
            coords[1:5, 0] = [-0.15, -0.3, -0.4, -0.5]
            coords[1:5, 1] = [0.1, 0.18, 0.2, 0.2]
            # Pinky extended right
            coords[17:21, 0] = [0.15, 0.3, 0.4, 0.5]
            coords[17:21, 1] = [0.1, 0.15, 0.18, 0.2]
            # Index/Middle/Ring folded
            for base in [5, 9, 13]:
                coords[base:base+4, 0] = [0.02, 0.04, 0.02, 0.01]
                coords[base:base+4, 1] = [0.1, 0.15, 0.1, 0.05]
                
        elif gesture == "I need water":
            # Thumb extended towards mouth (left/up), index/middle/ring/pinky folded
            coords[1:5, 0] = [-0.15, -0.25, -0.35, -0.45]
            coords[1:5, 1] = [0.15, 0.3, 0.4, 0.5] # Thumb pointing up and out
            # Others folded
            for base in [5, 9, 13, 17]:
                coords[base:base+4, 0] = [0.05, 0.08, 0.05, 0.03]
                coords[base:base+4, 1] = [0.08, 0.12, 0.08, 0.04]

        elif gesture == "D":
            # Index finger straight up, others closed in a circle with thumb
            # Index up
            coords[5:9, 0] = [0.0, 0.0, 0.0, 0.0]
            coords[5:9, 1] = [0.2, 0.4, 0.6, 0.8]
            # Others folded in circle
            coords[1:5, 0] = [0.08, 0.12, 0.1, 0.08]
            coords[1:5, 1] = [0.1, 0.18, 0.18, 0.18]
            for base in [9, 13, 17]:
                coords[base:base+4, 0] = [0.08, 0.1, 0.08, 0.06]
                coords[base:base+4, 1] = [0.1, 0.15, 0.12, 0.1]
                
        else: # Default fallback/Thank you
            # Flat hand slightly tilted
            coords[1:5, 0] = [-0.08, -0.15, -0.2, -0.25]
            coords[1:5, 1] = [0.1, 0.18, 0.22, 0.25]
            for base in [5, 9, 13, 17]:
                coords[base:base+4, 0] = [(base - 10)*0.02, (base - 10)*0.02, (base - 10)*0.02, (base - 10)*0.02]
                coords[base:base+4, 1] = [0.18, 0.35, 0.48, 0.6]

        # Add Gaussian noise to coordinates
        noise = np.random.normal(0, 0.02, coords.shape)
        coords_with_noise = coords + noise
        
        # Normalize and add to list
        samples.append(normalize_landmarks(coords_with_noise))
        
    return np.array(samples)

def train():
    logger.info("Generating synthetic hand landmark datasets...")
    X_list = []
    y_list = []
    
    for i, gesture in enumerate(GESTURES):
        samples = generate_simulated_landmarks(gesture, num_samples=200)
        
        # Original Cartesian samples
        X_list.append(samples)
        y_list.append(np.full(len(samples), i))
        
        # Mirror-augmentation (Flip X coordinate to make model hand-independent/mirror-independent)
        flipped_samples = samples.copy().reshape(-1, 21, 3)
        flipped_reshaped = flipped_samples.copy()
        flipped_reshaped[:, :, 0] = -flipped_reshaped[:, :, 0] # Flip X
        X_list.append(flipped_reshaped.reshape(-1, 63))
        y_list.append(np.full(len(samples), i))
        
    X = np.vstack(X_list)
    y = np.concatenate(y_list)
    
    logger.info(f"Dataset summary: {X.shape[0]} samples across {len(GESTURES)} classes.")
    
    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    logger.info("Training Multi-Layer Perceptron (Neural Network) classifier...")
    # Multi-Layer Perceptron neural network
    model = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation='relu',
        solver='adam',
        max_iter=500,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1
    )
    
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    logger.info(f"Model training complete! Test accuracy: {accuracy * 100:.2f}%")
    
    # Save model
    models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "gesture_model.pkl")
    
    payload = {
        "model": model,
        "gestures": GESTURES,
        "features_dim": 63
    }
    
    with open(model_path, "wb") as f:
        pickle.dump(payload, f)
        
    logger.info(f"Model successfully saved to {model_path}")

if __name__ == "__main__":
    train()

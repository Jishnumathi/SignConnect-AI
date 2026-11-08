# SignConnect AI

SignConnect AI is a real-time, AI-powered accessibility web application designed to translate sign language gestures captured via a webcam into spoken and written language. It tracks hand landmarks client-side to minimize processing latency, predicts sign gestures using a neural network, translates text into multiple regional Indian languages, and generates synthetic speech output using browser-native Text-to-Speech (TTS).

---

## Key Features

1. **Real-Time Sign Recognition**: Connects to the device webcam, processes streams using the MediaPipe Hands Web SDK, extracts 21 coordinate points, and outputs sign predictions at 30+ FPS.
2. **Multi-Language Translation**: Translates signs instantly into regional Indian languages:
   - Telugu
   - Hindi
   - Tamil
   - Malayalam
   - Urdu
   - Kannada
   - Bengali
3. **Interactive Text-to-Speech**: Converts translated text into spoken voice with full playback controls (Play, Pause, Resume, Stop) utilizing native system voices.
4. **Interactive Dashboard**: Full user metrics, total translations counts, favorite target languages, model accuracy indicators, recent translation history, and SVG-drawn charts showing activity over time.
5. **Report Export**: Users can export their history logs as a printable tabular PDF report.
6. **Robust Auth Flow**: Complete registration, login, logout, password reset, and user profile management.
7. **Emergency Mode**: Instant flash warnings, vocal alerts, and preset signs translation for critical scenarios.
8. **AI Chatbot**: A responsive drawer chatbot to assist users with using the app or learning about Indian Sign Language (ISL).

---

## Tech Stack

- **Frontend**: React.js, Tailwind CSS v4, Lucide React, MediaPipe Hands SDK
- **Backend**: Python Flask, Flask-CORS
- **AI/ML**: Scikit-Learn MLP Classifier (Neural Network), NumPy, MediaPipe
- **Database**: MongoDB (with automatic local SQLite fallback)

---

## Folder Structure

```
SignConnectAI/
├── backend/              # Flask APIs, ML loaders, and translators
│   ├── app.py            # Main API entry point
│   ├── model_loader.py   # Normalized landmarks parser & model wrapper
│   ├── translator.py     # Translation script (Google API + offline dictionary)
│   ├── train_model.py    # Mock dataset generator & MLP trainer
│   ├── test_api.py       # API route unittest suite
│   └── requirements.txt  # Python requirements
├── database/             # Unified database adapter
│   └── db_client.py      # Dual MongoDB & SQLite client connection
├── frontend/             # React (Vite) client folder
│   ├── src/              # React code folders
│   │   ├── components/   # Navbar, Auth, TranslatorStudio, Dashboard
│   │   ├── App.jsx       # State coordinator
│   │   ├── main.jsx      # DOM mounter
│   │   └── index.css     # Tailwind imports and premium global styles
│   ├── index.html        # HTML layout loading MediaPipe Web CDNs
│   ├── vite.config.js    # Vite dev server with proxy settings
│   └── package.json      # NPM dependencies
├── models/               # Saved trained ML models
│   └── gesture_model.pkl # Trained neural network weights
└── datasets/             # Local datasets folder (if any)
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
- **Python 3.10+** (Python 3.14.6 supported natively)
- **Node.js 18+** (Node.js 24.16.0 verified)
- **MongoDB** (Optional. If not running, the application seamlessly creates and uses an SQLite database `database/signconnect.db`).

---

### Step 1: Backend Setup & Model Training

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Train the AI model to generate the gesture weights:
   ```bash
   python train_model.py
   ```
   *Note: This script generates simulated hand landmarks, normalizes them, trains a Multi-Layer Perceptron neural network, and saves the weights to `../models/gesture_model.pkl`.*

4. Launch the Flask API server:
   ```bash
   python app.py
   ```
   *The Flask backend will start on `http://localhost:5000`.*

---

### Step 2: Frontend Setup

1. Open a separate terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Run the React development server:
   ```bash
   npm run dev
   ```
   *The React UI will launch on `http://localhost:5173`.*

---

## Running Unit Tests

To run the automated suite testing authentication, health indicators, database persistence, prediction arrays, and translations:
```bash
python backend/test_api.py
```

---

## Deployment Instructions

### Production Build

To build the React application for production deployment:
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Compile the static assets:
   ```bash
   npm run build
   ```
   This will bundle all React code, stylesheets, and assets into a production-optimized `dist` folder.

3. To serve the compiled production build from Flask:
   - Copy the files in `frontend/dist/` into Flask's static assets directory.
   - Configure Flask to render the `index.html` entry point.

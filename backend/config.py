import os

try:
    from dotenv import load_dotenv
    # Load environment variables from .env file
    load_dotenv()
except ImportError:
    pass

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "signconnect_super_secret_key_12345")
    
    # Database Settings
    # Supported: "sqlite", "mongodb", "postgres"
    DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()
    
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "signconnect_ai")
    
    POSTGRES_URI = os.getenv("POSTGRES_URI", "postgresql://postgres:postgres@localhost:5432/signconnect_ai")
    
    SQLITE_DB_PATH = os.getenv(
        "SQLITE_DB_PATH", 
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "signconnect.db")
    )
    
    # Security Settings
    RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "100 per minute")
    RATE_LIMIT_AUTH = os.getenv("RATE_LIMIT_AUTH", "5 per minute")
    
    # AI Classifier Settings
    PREDICTION_MIN_CONFIDENCE = float(os.getenv("PREDICTION_MIN_CONFIDENCE", "0.45"))
    MODEL_VERSION = os.getenv("MODEL_VERSION", "1.0.0")

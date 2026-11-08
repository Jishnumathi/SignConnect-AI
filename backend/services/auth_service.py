import re
import hashlib

try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes a password using bcrypt if available, otherwise SHA-256."""
        if BCRYPT_AVAILABLE:
            password_bytes = password.encode('utf-8')
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password_bytes, salt)
            return hashed.decode('utf-8')
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verifies a password against a bcrypt or SHA-256 hash."""
        try:
            if BCRYPT_AVAILABLE and (hashed_password.startswith("$2a$") or hashed_password.startswith("$2b$")):
                return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
            return hashlib.sha256(password.encode('utf-8')).hexdigest() == hashed_password
        except Exception:
            return False

    @staticmethod
    def validate_email(email: str) -> bool:
        """Checks if email format matches standard patterns."""
        if not email:
            return False
        # Simple robust email regex
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        return bool(re.match(pattern, email.strip()))

    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, str]:
        """
        Validates password strength rules.
        Rules: min 6 chars.
        """
        if not password:
            return False, "Password cannot be empty"
        if len(password) < 6:
            return False, "Password must be at least 6 characters long"
        return True, ""

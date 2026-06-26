import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dealz.db")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Extract db file name from URL (e.g., sqlite:///./dealz.db -> ./dealz.db)
DB_PATH = DATABASE_URL.replace("sqlite:///", "")
if not DB_PATH.startswith("/"):
    DB_PATH = str(BASE_DIR / DB_PATH)

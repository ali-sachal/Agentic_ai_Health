import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory or parent directory
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
PORT = int(os.getenv("PORT", "8000"))
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,*",
    ).split(",")
    if origin.strip()
]
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

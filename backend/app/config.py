import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", "db/finance.db"))
STATIC_DIR = os.getenv("STATIC_DIR")  # pre-built React app; unset in local dev

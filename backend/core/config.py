from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    NEWS_API_KEY = os.getenv("NEWS_API_KEY")

settings = Settings()
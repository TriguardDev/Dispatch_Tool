import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "dev-database")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER = os.getenv("MYSQL_USER", "admin")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "admin5683!")
    MYSQL_DB = os.getenv("MYSQL_DB", "dev")
    MYSQL_POOL_NAME = "mypool"
    MYSQL_POOL_SIZE = int(os.getenv("MYSQL_POOL_SIZE", 5))

    # SMTP
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    EMAIL_FROM = os.getenv("EMAIL_FROM")

    # Twilio
    TWILIO_ACCOUNT_SID=os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN=os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER=os.getenv("TWILIO_PHONE_NUMBER")
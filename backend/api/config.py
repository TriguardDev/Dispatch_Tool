import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT"))
    MYSQL_USER = os.getenv("MYSQL_USER")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
    MYSQL_DB = os.getenv("MYSQL_DB")
    MYSQL_POOL_NAME = "mypool"
    MYSQL_POOL_SIZE = int(os.getenv("MYSQL_POOL_SIZE"))

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

    # MAIL
    MAIL_SERVER = os.getenv("SMTP_HOST")
    MAIL_PORT = int(os.getenv("SMTP_PORT"))
    MAIL_USERNAME = os.getenv("SMTP_USER")
    MAIL_PASSWORD = os.getenv("SMTP_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("SMTP_USER")

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400))  # 24 hours in seconds
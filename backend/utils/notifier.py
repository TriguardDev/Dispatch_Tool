"""
Notification utilities for SMS and Email.

ENVIRONMENT-AWARE BEHAVIOR:
- Production (FLASK_ENV=production): Sends actual SMS and emails
- Development/Test: Only logs notifications without sending

This prevents accidental notifications during development and testing.
"""

from twilio.rest import Client
from config import Config
from flask_mail import Message
from extensions import mail
import logging

# Set up logger
logger = logging.getLogger(__name__)

def is_production_environment() -> bool:
    """
    Check if the current environment is production.
    
    Returns:
        bool: True if FLASK_ENV is set to 'production', False otherwise
    """
    return Config.FLASK_ENV == "production"

def send_email(to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """
    Send an email via Office 365 SMTP.
    In non-production environments, only logs the email instead of sending.

    Args:
        to_email (str): Recipient email address
        subject (str): Email subject
        html_body (str): HTML content of the email
        text_body (str, optional): Plain text content. Defaults to None.

    Returns:
        bool: True if email sent successfully (or logged in dev), False otherwise
    """
    # Check if we're in production environment
    if not is_production_environment():
        logger.info(f"[DEV] EMAIL (not sent) - To: {to_email}, Subject: {subject}")
        logger.info(f"[DEV] EMAIL Content: {html_body}")
        print(f"[DEV] EMAIL (not sent) - To: {to_email}, Subject: {subject}", flush=True)
        return True
    
    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            body=text_body or "",
            html=html_body
        )
        mail.send(msg)

        logger.info(f"[PROD] Email sent to {to_email}")
        print(f"[PROD] Email sent to {to_email}", flush=True)
        return True

    except Exception as e:
        logger.error(f"[PROD] Failed to send email: {e}")
        print(f"[ERROR] Failed to send email: {e}", flush=True)
        return False


def send_sms(to_phone: str, message: str) -> bool:
    """
    Send an SMS via Twilio.
    In non-production environments, only logs the SMS instead of sending.
    
    Args:
        to_phone (str): Recipient phone number
        message (str): SMS message content
        
    Returns:
        bool: True if SMS sent successfully (or logged in dev), False otherwise
    """
    # Check if we're in production environment
    if not is_production_environment():
        logger.info(f"[DEV] SMS (not sent) - To: {to_phone}")
        logger.info(f"[DEV] SMS Content: {message}")
        print(f"[DEV] SMS (not sent) - To: {to_phone}, Message: {message}", flush=True)
        return True
    
    try:
        client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=message,
            from_=Config.TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        logger.info(f"[PROD] SMS sent to {to_phone}, SID: {msg.sid}")
        print(f"[PROD] SMS sent to {to_phone}, SID: {msg.sid}", flush=True)
        return True
    except Exception as e:
        logger.error(f"[PROD] Failed to send SMS to {to_phone}: {e}")
        print(f"[ERROR] Failed to send SMS to {to_phone}: {e}", flush=True)
        return False
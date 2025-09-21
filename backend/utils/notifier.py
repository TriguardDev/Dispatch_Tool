from twilio.rest import Client
from config import Config
from flask_mail import Message
from extensions import mail

def send_email(to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """
    Send an email via Office 365 SMTP.

    Args:
        to_email (str): Recipient email address
        subject (str): Email subject
        html_body (str): HTML content of the email
        text_body (str, optional): Plain text content. Defaults to None.

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            body=text_body or "",
            html=html_body
        )
        mail.send(msg)

        print(f"[INFO] Email sent to {to_email}", flush=True)
        return True

    except Exception as e:
        print(f"[ERROR] Failed to send email: {e}", flush=True)
        return False


def send_sms(to_phone: str, message: str) -> bool:
    """
    Send an SMS via Twilio.
    """
    try:
        client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=message,
            from_=Config.TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        print(f"[INFO] SMS sent to {to_phone}, SID: {msg.sid}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send SMS to {to_phone}: {e}")
        return False
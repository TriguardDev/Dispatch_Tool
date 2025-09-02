import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config import Config

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
        print(f"STMP User: {Config.SMTP_USER}")

        # Create a multipart message
        msg = MIMEMultipart("alternative")
        msg["From"] = Config.EMAIL_FROM
        msg["To"] = to_email
        msg["Subject"] = subject

        # Attach text and HTML parts
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Connect to Office 365 SMTP server
        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()  # Enable TLS
            server.ehlo()
            server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            server.send_message(msg)

        print(f"[INFO] Email sent to {to_email}", flush=True)
        return True

    except smtplib.SMTPAuthenticationError:
        print(f"[ERROR] Authentication failed. Check SMTP_USER and SMTP_PASSWORD.", flush=True)
        return False
    except smtplib.SMTPException as e:
        print(f"[ERROR] SMTP error: {e}", flush=True)
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error sending email to {to_email}: {e}", flush=True)
        return False
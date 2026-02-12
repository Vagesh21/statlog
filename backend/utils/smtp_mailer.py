import smtplib
from email.mime.text import MIMEText
from typing import Dict, Tuple


def smtp_is_configured(smtp: Dict) -> Tuple[bool, str]:
    required = ["server", "port", "username", "app_password", "email_from", "email_to"]
    for key in required:
        if not smtp.get(key):
            return False, f"Missing SMTP field: {key}"
    return True, "configured"


def send_email_sync(smtp: Dict, subject: str, body: str, to_email: str = "") -> None:
    recipient = to_email or smtp.get("email_to")
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = f"{smtp.get('email_from_name', 'Pi Monitor')} <{smtp.get('email_from')}>"
    msg['To'] = recipient

    secure = (smtp.get('secure') or 'ssl').lower()
    server = smtp.get('server')
    port = int(smtp.get('port') or (465 if secure == 'ssl' else 587))
    username = smtp.get('username')
    password = smtp.get('app_password')

    if secure == 'ssl':
        with smtplib.SMTP_SSL(server, port, timeout=20) as client:
            client.login(username, password)
            client.send_message(msg)
    else:
        with smtplib.SMTP(server, port, timeout=20) as client:
            client.starttls()
            client.login(username, password)
            client.send_message(msg)

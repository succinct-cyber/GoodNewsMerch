from django.conf import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def send_email_via_sendgrid(subject, message, to_email):
    email = Mail(
        from_email=settings.DEFAULT_FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=message,
    )

    sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
    response = sg.send(email)
    return response.status_code
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

def send_alert_email(sku: str, message: str, date: str):
    """
    Sends a critical stockout alert email using SMTP.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🚨 Critical Stock Alert: {sku}"
        msg["From"] = settings.SMTP_USER
        msg["To"] = settings.ALERT_EMAIL_TO

        # Create the HTML version of your message
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #ef4444; padding: 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Critical Stock Alert</h2>
              </div>
              <div style="padding: 30px;">
                <h3 style="color: #18181b; margin-top: 0;">Product: {sku}</h3>
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.5;">
                  The inventory engine has detected a critical stock condition for this product.
                </p>
                <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                  <p style="color: #991b1b; margin: 0; font-weight: bold;">{message}</p>
                </div>
                <p style="color: #71717a; font-size: 14px;">Date Detected: {date}</p>
                <a href="http://localhost:5173/alerts" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 20px;">View Dashboard</a>
              </div>
              <div style="background-color: #f4f4f5; padding: 15px; text-align: center; border-top: 1px solid #e4e4e7;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">Project Titan - Enterprise Demand Forecasting Platform</p>
              </div>
            </div>
          </body>
        </html>
        """

        part = MIMEText(html, "html")
        msg.attach(part)

        # Send the email
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, settings.ALERT_EMAIL_TO, msg.as_string())
            
        print(f"✅ Alert email sent successfully to {settings.ALERT_EMAIL_TO} for {sku}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

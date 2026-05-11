#!/usr/bin/env python3
"""
Test SMTP connection script
Run this to diagnose email sending issues
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM', SMTP_USER)

print("=" * 60)
print("SMTP Connection Test")
print("=" * 60)
print(f"SMTP_HOST: {SMTP_HOST}")
print(f"SMTP_PORT: {SMTP_PORT}")
print(f"SMTP_USER: {SMTP_USER}")
print(f"SMTP_PASSWORD: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else 'NOT SET'}")
print(f"EMAIL_FROM: {EMAIL_FROM}")
print("=" * 60)

if not SMTP_USER or not SMTP_PASSWORD:
    print("❌ ERROR: SMTP_USER or SMTP_PASSWORD not set!")
    exit(1)

if EMAIL_FROM != SMTP_USER:
    print(f"⚠️  WARNING: EMAIL_FROM ({EMAIL_FROM}) doesn't match SMTP_USER ({SMTP_USER})")
    print("   Gmail requires them to match. Using SMTP_USER as EMAIL_FROM.")
    EMAIL_FROM = SMTP_USER

test_email = input("\nEnter test email address to send to: ").strip()
if not test_email:
    print("❌ No email address provided")
    exit(1)

try:
    print(f"\n📧 Attempting to connect to {SMTP_HOST}:{SMTP_PORT}...")
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    print("✅ Connected to SMTP server")
    
    print("🔐 Starting TLS...")
    server.starttls()
    print("✅ TLS started")
    
    print(f"🔑 Logging in as {SMTP_USER}...")
    server.login(SMTP_USER, SMTP_PASSWORD)
    print("✅ Login successful")
    
    print(f"📨 Creating email from {EMAIL_FROM} to {test_email}...")
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Test Email - Family Housing Hub'
    msg['From'] = EMAIL_FROM
    msg['To'] = test_email
    
    body = """
    <html>
    <body>
        <h2>Test Email</h2>
        <p>This is a test email from Family Housing Hub backend.</p>
        <p>If you received this, your SMTP configuration is working! ✅</p>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(body, 'html'))
    
    print(f"📤 Sending email...")
    server.send_message(msg)
    server.quit()
    
    print("=" * 60)
    print("✅ SUCCESS! Email sent successfully!")
    print(f"   Check {test_email} inbox (and spam folder)")
    print("=" * 60)
    
except smtplib.SMTPAuthenticationError as e:
    print("=" * 60)
    print("❌ AUTHENTICATION ERROR")
    print("=" * 60)
    print(f"Error: {e}")
    print("\nPossible causes:")
    print("1. Wrong password - Make sure you're using Gmail App Password, not regular password")
    print("2. 2-Step Verification not enabled - Enable it first, then generate App Password")
    print("3. App Password expired or revoked - Generate a new one")
    print("\nHow to fix:")
    print("1. Go to: https://myaccount.google.com/apppasswords")
    print("2. Generate a new App Password for 'Mail'")
    print("3. Update SMTP_PASSWORD in Render with the new 16-character password")
    
except smtplib.SMTPException as e:
    print("=" * 60)
    print("❌ SMTP ERROR")
    print("=" * 60)
    print(f"Error: {e}")
    print("\nPossible causes:")
    print("1. Wrong SMTP_HOST - Should be 'smtp.gmail.com'")
    print("2. Wrong SMTP_PORT - Should be 587")
    print("3. Firewall blocking connection")
    
except Exception as e:
    print("=" * 60)
    print("❌ UNEXPECTED ERROR")
    print("=" * 60)
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()





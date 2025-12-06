#!/usr/bin/env python3
"""
Test script for email and SMS verification
Run this to verify your Gmail and Twilio configuration
"""

import os
import sys
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables
load_dotenv()

def test_email_config():
    """Test email/SMTP configuration"""
    print("\n" + "="*50)
    print("Testing Email Configuration")
    print("="*50)
    
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    email_from = os.getenv('EMAIL_FROM', smtp_user)
    
    if not smtp_user or not smtp_password:
        print("❌ Email configuration missing!")
        print("   Please set SMTP_USER and SMTP_PASSWORD in .env file")
        return False
    
    print(f"✅ SMTP Host: {smtp_host}")
    print(f"✅ SMTP Port: {smtp_port}")
    print(f"✅ SMTP User: {smtp_user}")
    print(f"✅ Email From: {email_from}")
    
    # Test connection
    try:
        print("\n📧 Testing SMTP connection...")
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.quit()
        print("✅ SMTP connection successful!")
        return True
    except Exception as e:
        print(f"❌ SMTP connection failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your SMTP credentials")
        print("  2. For Gmail: Make sure you're using an App Password")
        print("  3. Check if 2FA is enabled on your Google account")
        return False

def test_sms_config():
    """Test Twilio/SMS configuration"""
    print("\n" + "="*50)
    print("Testing SMS Configuration")
    print("="*50)
    
    twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
    twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
    twilio_phone = os.getenv('TWILIO_PHONE_NUMBER')
    
    if not twilio_sid or not twilio_token or not twilio_phone:
        print("❌ Twilio configuration missing!")
        print("   Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env file")
        return False
    
    print(f"✅ Account SID: {twilio_sid[:10]}...")
    print(f"✅ Auth Token: {'*' * len(twilio_token)}")
    print(f"✅ Phone Number: {twilio_phone}")
    
    # Test Twilio client
    try:
        print("\n📱 Testing Twilio connection...")
        from twilio.rest import Client
        client = Client(twilio_sid, twilio_token)
        
        # Try to fetch account info
        account = client.api.accounts(twilio_sid).fetch()
        print(f"✅ Twilio connection successful!")
        print(f"   Account Status: {account.status}")
        print(f"   Account Type: {account.type}")
        return True
    except ImportError:
        print("❌ Twilio library not installed!")
        print("   Run: pip install twilio")
        return False
    except Exception as e:
        print(f"❌ Twilio connection failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your Twilio credentials")
        print("  2. Verify your Account SID and Auth Token")
        print("  3. Make sure your Twilio account is active")
        return False

def test_send_email():
    """Test sending a verification email"""
    print("\n" + "="*50)
    print("Testing Email Sending")
    print("="*50)
    
    test_email = input("Enter your email address to test: ").strip()
    if not test_email:
        print("❌ No email provided")
        return False
    
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    email_from = os.getenv('EMAIL_FROM', smtp_user)
    
    test_code = "123456"
    
    try:
        print(f"\n📧 Sending test email to {test_email}...")
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Family Housing Hub - Test Verification Code'
        msg['From'] = email_from
        msg['To'] = test_email
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">Test Email Verification</h2>
                <p>This is a test email from Family Housing Hub.</p>
                <p>Your test verification code is:</p>
                <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px; margin: 0;">{test_code}</h1>
                </div>
                <p>If you received this email, your email configuration is working correctly!</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        
        print("✅ Test email sent successfully!")
        print(f"   Check your inbox at {test_email}")
        print(f"   Test code: {test_code}")
        return True
    except Exception as e:
        print(f"❌ Failed to send test email: {e}")
        return False

def test_send_sms():
    """Test sending a verification SMS"""
    print("\n" + "="*50)
    print("Testing SMS Sending")
    print("="*50)
    
    test_phone = input("Enter your phone number (10 digits, no dashes): ").strip().replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
    if not test_phone or len(test_phone) != 10:
        print("❌ Invalid phone number. Please enter 10 digits.")
        return False
    
    twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
    twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
    twilio_phone = os.getenv('TWILIO_PHONE_NUMBER')
    
    test_code = "123456"
    formatted_phone = f"+1{test_phone}"
    
    try:
        print(f"\n📱 Sending test SMS to {formatted_phone}...")
        
        from twilio.rest import Client
        client = Client(twilio_sid, twilio_token)
        
        message = client.messages.create(
            body=f'Family Housing Hub Test: Your verification code is {test_code}. This is a test message.',
            from_=twilio_phone,
            to=formatted_phone
        )
        
        print("✅ Test SMS sent successfully!")
        print(f"   Message SID: {message.sid}")
        print(f"   Check your phone for the message")
        print(f"   Test code: {test_code}")
        return True
    except Exception as e:
        print(f"❌ Failed to send test SMS: {e}")
        print("\nNote: Trial Twilio accounts can only send to verified numbers.")
        print("   Verify your number at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified")
        return False

def main():
    """Main test function"""
    print("\n" + "="*50)
    print("Family Housing Hub - Verification Test Suite")
    print("="*50)
    
    # Check if .env exists
    if not os.path.exists('.env'):
        print("\n❌ .env file not found!")
        print("   Please create a .env file in the backend/ directory")
        print("   You can copy .env.example as a template")
        return
    
    # Test configurations
    email_ok = test_email_config()
    sms_ok = test_sms_config()
    
    if not email_ok and not sms_ok:
        print("\n⚠️  Note: Email and/or SMS configuration may be incomplete.")
        print("   You can still test individual services if partially configured.")
        print("   Continue with testing? (y/n)")
        response = input().strip().lower()
        if response != 'y':
            return
    
    # Ask if user wants to test sending
    print("\n" + "="*50)
    response = input("\nDo you want to test sending actual emails/SMS? (y/n): ").strip().lower()
    
    if response == 'y':
        if email_ok:
            test_send_email()
        if sms_ok:
            test_send_sms()
    
    print("\n" + "="*50)
    print("Test Complete!")
    print("="*50)
    print("\nNext steps:")
    print("1. Start your backend: python app.py")
    print("2. Test the verification flow in your app")
    print("3. Check the /api/health endpoint to verify services")

if __name__ == '__main__':
    main()


# 🎯 AWS Setup - Complete Step-by-Step Guide

## 📋 Overview

We'll set up these FREE services:
1. AWS Account & Access Keys
2. AWS S3 (File Storage)
3. Amazon Rekognition (AI Image Analysis)
4. Amazon Polly (Text-to-Speech)
5. Amazon Transcribe (Speech-to-Text)
6. Amazon SES (Email Service)
7. AWS Amplify (Hosting)

**Time needed:** 30 minutes
**Cost:** $0 (100% Free Tier)

---

## 🚀 STEP 1: Create AWS Account (5 minutes)

### **What you need:**
- Email address
- Credit card (won't be charged)
- Phone number

### **Steps:**

1. **Go to AWS Website**
   - Open: https://aws.amazon.com/free/
   - Click **"Create a Free Account"** (orange button)

2. **Enter Your Details**
   - **Email address:** Your email
   - **Password:** Choose a strong password
   - **AWS account name:** `family-housing-hub`
   - Click **"Continue"**

3. **Contact Information**
   - **Account type:** Choose `Personal`
   - **Full name:** Your name
   - **Phone number:** Your number
   - **Country:** United States
   - **Address:** Your address
   - Click **"Create Account and Continue"**

4. **Payment Information**
   - Enter credit card details
   - ⚠️ **Don't worry!** You won't be charged unless you exceed free tier
   - We'll set up billing alerts (Step 2)
   - Click **"Verify and Continue"**

5. **Identity Verification**
   - Choose: **Text message (SMS)** or **Voice call**
   - Enter verification code
   - Click **"Continue"**

6. **Select Support Plan**
   - Choose: **Basic support - Free** ✅
   - Click **"Complete sign up"**

7. **✅ Done!**
   - You'll see "Congratulations!"
   - Click **"Go to AWS Management Console"**

---

## 🔐 STEP 2: Create Access Keys (3 minutes)

### **Why:** Your app needs these to connect to AWS services

### **Steps:**

1. **Go to IAM Console**
   - In AWS Console, search for `IAM` in the top search bar
   - Click **"IAM"** (Identity and Access Management)

2. **Create Access Keys**
   - On the left menu, click **"Users"**
   - Click **"Create user"**
   - **User name:** `family-hub-admin`
   - Check: ✅ **"Provide user access to the AWS Management Console"**
   - Click **"Next"**

3. **Set Permissions**
   - Choose: **"Attach policies directly"**
   - Search and check these policies:
     - ✅ `AmazonS3FullAccess`
     - ✅ `AmazonRekognitionFullAccess`
     - ✅ `AmazonPollyFullAccess`
     - ✅ `AmazonTranscribeFullAccess`
     - ✅ `AmazonSESFullAccess`
     - ✅ `AmazonSNSFullAccess`
     - ✅ `AWSAmplifyFullAccess`
   - Click **"Next"**
   - Click **"Create user"**

4. **Create Access Key**
   - Click on the user you just created (`family-hub-admin`)
   - Click **"Security credentials"** tab
   - Scroll to **"Access keys"**
   - Click **"Create access key"**
   - Choose: **"Command Line Interface (CLI)"**
   - Check the confirmation box
   - Click **"Next"**
   - Description: `Family Hub App`
   - Click **"Create access key"**

5. **⚠️ SAVE YOUR KEYS!**
   - You'll see:
     - **Access key ID**: `AKIA...` (copy this)
     - **Secret access key**: `wJal...` (copy this)
   - **IMPORTANT:** Save these somewhere safe!
   - Click **"Download .csv file"** (backup)
   - Click **"Done"**

✅ **Keep these keys safe! You'll need them in Step 4**

---

## 💰 STEP 3: Set Up Billing Alerts (2 minutes)

### **Why:** Get notified if you're about to be charged

### **Steps:**

1. **Go to Billing Console**
   - Click your name (top right)
   - Click **"Billing and Cost Management"**

2. **Enable Billing Alerts**
   - Click **"Billing preferences"** (left menu)
   - Check: ✅ **"Receive Free Tier Usage Alerts"**
   - Enter your email
   - Check: ✅ **"Receive Billing Alerts"**
   - Click **"Save preferences"**

3. **Create Budget**
   - Click **"Budgets"** (left menu)
   - Click **"Create budget"**
   - Choose: **"Zero spend budget"**
   - Budget name: `No Charges Alert`
   - Email: Your email
   - Click **"Create budget"**

✅ **You'll get an email if anything tries to charge you!**

---

## 💻 STEP 4: Configure AWS CLI (5 minutes)

### **What:** Set up your computer to connect to AWS

### **Steps:**

1. **Open Terminal**
   - Press `Cmd + Space`
   - Type `Terminal`
   - Press Enter

2. **Check AWS CLI is Installed**
   ```bash
   aws --version
   ```
   
   **If you see:** `aws-cli/2.x.x` → ✅ Already installed! Go to step 3.
   
   **If you see:** `command not found` → Install it:
   ```bash
   brew install awscli
   ```

3. **Configure AWS**
   ```bash
   aws configure
   ```

4. **Enter Your Keys** (from Step 2)
   ```
   AWS Access Key ID [None]: AKIA... (paste your access key)
   AWS Secret Access Key [None]: wJal... (paste your secret key)
   Default region name [None]: us-east-1
   Default output format [None]: json
   ```

5. **Test It Works**
   ```bash
   aws s3 ls
   ```
   
   **If you see:** Nothing (empty list) → ✅ Perfect!
   
   **If you see:** Error → Your keys are wrong, run `aws configure` again

✅ **AWS CLI is configured!**

---

## 🎯 STEP 5: Initialize Amplify (10 minutes)

### **What:** Set up your project to use AWS services

### **Steps:**

1. **Go to Your Project**
   ```bash
   cd /Users/samuelraymond/Documents/Family-Housing-Hub
   ```

2. **Initialize Amplify**
   ```bash
   amplify init
   ```

3. **Answer Questions:**
   ```
   ? Enter a name for the project: familyhousinghub
   
   ? Initialize the project with the above configuration? Yes
   
   ? Select the authentication method you want to use: AWS profile
   
   ? Please choose the profile you want to use: default
   ```

4. **Wait...**
   - This takes 2-3 minutes
   - You'll see: "✔ Initialized your environment successfully."

✅ **Amplify is initialized!**

---

## 📦 STEP 6: Add S3 Storage (5 minutes)

### **What:** Set up file storage for photos, documents, receipts

### **Steps:**

1. **Add Storage**
   ```bash
   amplify add storage
   ```

2. **Answer Questions:**
   ```
   ? Select from one of the below mentioned services:
   ❯ Content (Images, audio, video, etc.)
   
   ? Provide a friendly name for your resource:
   familyStorage
   
   ? Provide bucket name:
   familyhousinghub-storage-<random>
   (Press Enter to accept)
   
   ? Who should have access:
   ❯ Auth users only
   
   ? What kind of access do you want for Authenticated users?
   ✔ create/update
   ✔ read
   ✔ delete
   
   ? Do you want to add a Lambda Trigger for your S3 Bucket?
   No
   ```

3. **Push to AWS**
   ```bash
   amplify push
   ```

4. **Confirm:**
   ```
   ? Are you sure you want to continue?
   Yes
   ```

5. **Wait...**
   - This takes 3-5 minutes
   - You'll see: "✔ All resources are updated in the cloud"

✅ **S3 Storage is ready!**

---

## 🤖 STEP 7: Enable AI Services (In AWS Console)

### **A) Enable Amazon Rekognition**

1. **Go to Rekognition Console**
   - In AWS Console, search for `Rekognition`
   - Click **"Amazon Rekognition"**

2. **Get Started**
   - Click **"Use Amazon Rekognition"** or **"Get started"**
   - That's it! ✅ No additional setup needed

### **B) Enable Amazon Polly**

1. **Go to Polly Console**
   - In AWS Console, search for `Polly`
   - Click **"Amazon Polly"**

2. **Test It (Optional)**
   - Enter text: `Hello from Family Hub!`
   - Click **"Synthesize speech"**
   - Listen to make sure it works
   - ✅ Done!

### **C) Enable Amazon Transcribe**

1. **Go to Transcribe Console**
   - In AWS Console, search for `Transcribe`
   - Click **"Amazon Transcribe"**

2. **Get Started**
   - Click **"Get started"** if you see it
   - ✅ Done!

### **D) Enable Amazon SES (Email)**

1. **Go to SES Console**
   - In AWS Console, search for `SES`
   - Click **"Amazon Simple Email Service"**

2. **Verify Your Email**
   - Click **"Verified identities"** (left menu)
   - Click **"Create identity"**
   - Choose: **Email address**
   - Enter your email: `kwibesamuel@gmail.com`
   - Click **"Create identity"**

3. **Check Your Email**
   - You'll get an email: "Amazon SES Email Verification Request"
   - Click the verification link
   - ✅ Email verified!

4. **Request Production Access** (Optional, for higher limits)
   - Click **"Account dashboard"** (left menu)
   - Click **"Request production access"**
   - Fill out the form (takes 24 hours to approve)
   - For now, you can send 200 emails/day (sandbox mode)

✅ **All AI services are enabled!**

---

## 📦 STEP 8: Install AWS SDK Packages (2 minutes)

### **What:** Add AWS libraries to your project

### **Steps:**

1. **Install Packages**
   ```bash
   cd /Users/samuelraymond/Documents/Family-Housing-Hub
   
   npm install @aws-sdk/client-rekognition @aws-sdk/client-polly @aws-sdk/client-transcribe-streaming @aws-sdk/client-ses @aws-sdk/client-sns
   ```

2. **Wait...**
   - This takes 1-2 minutes
   - You'll see: "added X packages"

✅ **AWS SDKs are installed!**

---

## 🎉 STEP 9: Verify Everything Works

### **Check AWS CLI**
```bash
aws s3 ls
```
✅ Should work without errors

### **Check Amplify**
```bash
amplify status
```
✅ Should show:
```
| Category | Resource name | Operation | Provider plugin |
| -------- | ------------- | --------- | --------------- |
| Storage  | familyStorage | No Change | awscloudformation |
```

### **Check AWS Console**
1. Go to: https://console.aws.amazon.com/
2. Search for `S3`
3. You should see a bucket: `familyhousinghub-storage-...`

✅ **Everything is set up!**

---

## 📝 Summary - What You Did

1. ✅ Created AWS account
2. ✅ Created access keys
3. ✅ Set up billing alerts ($0 budget)
4. ✅ Configured AWS CLI
5. ✅ Initialized Amplify
6. ✅ Added S3 storage
7. ✅ Enabled AI services (Rekognition, Polly, Transcribe)
8. ✅ Enabled SES (Email)
9. ✅ Installed AWS SDK packages

---

## 🚀 What's Next?

Tell me you're done, and I'll:
1. ✅ Integrate S3 into your app (file uploads)
2. ✅ Add receipt scanner (Rekognition OCR)
3. ✅ Add voice announcements (Polly)
4. ✅ Add voice commands (Transcribe)
5. ✅ Add email notifications (SES)
6. ✅ Deploy to AWS Amplify (better hosting)

**All features will be 100% FREE!** 🎉

---

## 🆘 Troubleshooting

### **Problem: "aws: command not found"**
**Solution:**
```bash
brew install awscli
```

### **Problem: "amplify: command not found"**
**Solution:**
```bash
npm install -g @aws-amplify/cli
```

### **Problem: "Access Denied" errors**
**Solution:**
- Make sure you copied the access keys correctly
- Run `aws configure` again
- Check that you added the right permissions in IAM

### **Problem: "amplify init" asks for credentials**
**Solution:**
- Choose "AWS profile"
- Choose "default"
- If it doesn't work, run `aws configure` first

### **Problem: Email not verified in SES**
**Solution:**
- Check spam folder for verification email
- Make sure you clicked the link in the email
- Try creating a new identity if needed

---

## 💰 Cost Monitoring

### **How to Check Your Bill:**
1. AWS Console → Click your name → Billing Dashboard
2. You should see: **$0.00**

### **Free Tier Limits:**
- S3: 5 GB storage, 20,000 GET, 2,000 PUT (12 months)
- Rekognition: 5,000 images/month (12 months)
- Polly: 5 million characters/month (12 months)
- Transcribe: 60 minutes/month (12 months)
- SES: 3,000 emails/month (always free from Lambda)
- Amplify: 1,000 build minutes, 15 GB hosting (always free)

**Your app won't exceed these!** ✅

---

## ✅ Checklist

Mark these as you complete them:

- [ ] AWS account created
- [ ] Access keys saved
- [ ] Billing alerts set up
- [ ] AWS CLI configured (`aws configure`)
- [ ] Amplify initialized (`amplify init`)
- [ ] S3 storage added (`amplify add storage`)
- [ ] Changes pushed to AWS (`amplify push`)
- [ ] Rekognition enabled
- [ ] Polly enabled
- [ ] Transcribe enabled
- [ ] SES email verified
- [ ] AWS SDK packages installed

**When all are checked, you're ready!** 🎉



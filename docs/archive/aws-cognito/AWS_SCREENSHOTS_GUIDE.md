# 📸 AWS Setup - Visual Guide (What You'll See)

## 🎯 This guide shows you exactly what you'll see at each step

---

## 📱 STEP 1: Create AWS Account

### **What you'll see:**

**1.1 - AWS Homepage**
```
┌─────────────────────────────────────────┐
│  AWS                         Sign In    │
├─────────────────────────────────────────┤
│                                         │
│    Explore the AWS Free Tier           │
│                                         │
│    [Create a Free Account]  ← CLICK    │
│                                         │
└─────────────────────────────────────────┘
```

**1.2 - Email & Password**
```
┌─────────────────────────────────────────┐
│  Create an AWS account                  │
├─────────────────────────────────────────┤
│  Email address:                         │
│  [____________________]                 │
│                                         │
│  Password:                              │
│  [____________________]                 │
│                                         │
│  AWS account name:                      │
│  [family-housing-hub___]                │
│                                         │
│  [Continue]  ← CLICK                   │
└─────────────────────────────────────────┘
```

**1.3 - Contact Information**
```
┌─────────────────────────────────────────┐
│  Contact Information                    │
├─────────────────────────────────────────┤
│  Account type:                          │
│  ( ) Business  (•) Personal ← SELECT   │
│                                         │
│  Full Name:                             │
│  [____________________]                 │
│                                         │
│  Phone Number:                          │
│  [____________________]                 │
│                                         │
│  Country:                               │
│  [United States       v]                │
│                                         │
│  Address, City, State, ZIP              │
│  [____________________]                 │
│                                         │
│  [Create Account and Continue]  ← CLICK│
└─────────────────────────────────────────┘
```

**1.4 - Payment Information**
```
┌─────────────────────────────────────────┐
│  Payment Information                    │
├─────────────────────────────────────────┤
│  ⚠️ Your card will NOT be charged      │
│  unless you exceed the Free Tier       │
│                                         │
│  Credit Card Number:                    │
│  [____________________]                 │
│                                         │
│  Expiration Date:                       │
│  [MM/YY]                               │
│                                         │
│  CVV:                                   │
│  [___]                                 │
│                                         │
│  [Verify and Continue]  ← CLICK        │
└─────────────────────────────────────────┘
```

**1.5 - Identity Verification**
```
┌─────────────────────────────────────────┐
│  Confirm your identity                  │
├─────────────────────────────────────────┤
│  How would you like to receive your    │
│  verification code?                     │
│                                         │
│  (•) Text message (SMS)  ← SELECT      │
│  ( ) Voice call                        │
│                                         │
│  Phone number: +1 603-661-5417         │
│                                         │
│  [Send SMS]  ← CLICK                   │
│                                         │
│  Enter security check:                  │
│  [____]                                │
│                                         │
│  [Continue]                            │
└─────────────────────────────────────────┘
```

**1.6 - Support Plan**
```
┌─────────────────────────────────────────┐
│  Select a support plan                  │
├─────────────────────────────────────────┤
│  (•) Basic Support - Free  ← SELECT    │
│      • Account and billing support     │
│      • Service health dashboard        │
│      • No technical support            │
│                                         │
│  ( ) Developer - $29/month             │
│  ( ) Business - $100/month             │
│                                         │
│  [Complete sign up]  ← CLICK           │
└─────────────────────────────────────────┘
```

**1.7 - Success!**
```
┌─────────────────────────────────────────┐
│  🎉 Congratulations!                   │
├─────────────────────────────────────────┤
│  Your AWS account is ready!            │
│                                         │
│  [Go to AWS Management Console] ← CLICK│
└─────────────────────────────────────────┘
```

---

## 🔐 STEP 2: Create Access Keys

### **What you'll see:**

**2.1 - AWS Console Dashboard**
```
┌─────────────────────────────────────────┐
│  AWS  [Search: IAM______]  🔍 ← TYPE   │
├─────────────────────────────────────────┤
│  Services  EC2  S3  RDS  Lambda        │
│                                         │
│  Recently visited                       │
│  • IAM  ← CLICK THIS                   │
│  • S3                                  │
│  • CloudWatch                          │
└─────────────────────────────────────────┘
```

**2.2 - IAM Dashboard**
```
┌─────────────────────────────────────────┐
│  IAM Dashboard                          │
├─────────────────────────────────────────┤
│  Left Menu:                            │
│  • Dashboard                           │
│  • Users  ← CLICK THIS                 │
│  • User groups                         │
│  • Roles                               │
│  • Policies                            │
└─────────────────────────────────────────┘
```

**2.3 - Create User**
```
┌─────────────────────────────────────────┐
│  Users                                  │
├─────────────────────────────────────────┤
│  [Create user]  ← CLICK                │
│                                         │
│  No users yet                           │
└─────────────────────────────────────────┘
```

**2.4 - User Details**
```
┌─────────────────────────────────────────┐
│  Create user                            │
├─────────────────────────────────────────┤
│  User name:                            │
│  [family-hub-admin____]  ← TYPE        │
│                                         │
│  ✓ Provide user access to AWS Console │
│                                         │
│  [Next]  ← CLICK                       │
└─────────────────────────────────────────┘
```

**2.5 - Set Permissions**
```
┌─────────────────────────────────────────┐
│  Set permissions                        │
├─────────────────────────────────────────┤
│  (•) Attach policies directly  ← SELECT│
│                                         │
│  Search: [s3__________]  🔍            │
│                                         │
│  Policies:                             │
│  ☑ AmazonS3FullAccess  ← CHECK ALL    │
│  ☑ AmazonRekognitionFullAccess         │
│  ☑ AmazonPollyFullAccess               │
│  ☑ AmazonTranscribeFullAccess          │
│  ☑ AmazonSESFullAccess                 │
│  ☑ AmazonSNSFullAccess                 │
│  ☑ AWSAmplifyFullAccess                │
│                                         │
│  [Next]  ← CLICK                       │
└─────────────────────────────────────────┘
```

**2.6 - Review and Create**
```
┌─────────────────────────────────────────┐
│  Review and create                      │
├─────────────────────────────────────────┤
│  User name: family-hub-admin           │
│  Policies: 7 policies attached         │
│                                         │
│  [Create user]  ← CLICK                │
└─────────────────────────────────────────┘
```

**2.7 - User Created - Click on User**
```
┌─────────────────────────────────────────┐
│  Users                                  │
├─────────────────────────────────────────┤
│  User name          Status             │
│  family-hub-admin   Active  ← CLICK    │
└─────────────────────────────────────────┘
```

**2.8 - Security Credentials Tab**
```
┌─────────────────────────────────────────┐
│  family-hub-admin                       │
├─────────────────────────────────────────┤
│  Permissions | Groups | Tags            │
│  [Security credentials]  ← CLICK        │
└─────────────────────────────────────────┘
```

**2.9 - Create Access Key**
```
┌─────────────────────────────────────────┐
│  Security credentials                   │
├─────────────────────────────────────────┤
│  Access keys                           │
│  No access keys yet                    │
│                                         │
│  [Create access key]  ← CLICK          │
└─────────────────────────────────────────┘
```

**2.10 - Select Use Case**
```
┌─────────────────────────────────────────┐
│  Access key best practices              │
├─────────────────────────────────────────┤
│  (•) Command Line Interface (CLI)      │
│      ← SELECT THIS                     │
│                                         │
│  ( ) Local code                        │
│  ( ) Third party service               │
│                                         │
│  ☑ I understand the risks              │
│                                         │
│  [Next]  ← CLICK                       │
└─────────────────────────────────────────┘
```

**2.11 - ⚠️ IMPORTANT - Save These Keys!**
```
┌─────────────────────────────────────────┐
│  Retrieve access keys                   │
├─────────────────────────────────────────┤
│  ⚠️ This is your only chance to save   │
│  the secret access key!                │
│                                         │
│  Access key ID:                        │
│  AKIAIOSFODNN7EXAMPLE  ← COPY THIS    │
│                                         │
│  Secret access key:    [Show]          │
│  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMP  │
│  ← COPY THIS                           │
│                                         │
│  [Download .csv file]  ← CLICK THIS    │
│                                         │
│  [Done]                                │
└─────────────────────────────────────────┘
```

---

## 💻 STEP 4: Configure AWS CLI (Terminal)

### **What you'll see in Terminal:**

**4.1 - Check AWS CLI**
```bash
$ aws --version
aws-cli/2.29.1 Python/3.13.7 Darwin/24.6.0 exe/x86_64
✅ Already installed!
```

**4.2 - Configure AWS**
```bash
$ aws configure
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
                          ↑ Paste your key here

AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMP
                               ↑ Paste your secret here

Default region name [None]: us-east-1
                            ↑ Type this

Default output format [None]: json
                              ↑ Type this
```

**4.3 - Test Configuration**
```bash
$ aws s3 ls

↑ You'll see nothing (empty) - that's perfect! ✅
```

---

## 🎯 STEP 5: Initialize Amplify (Terminal)

### **What you'll see:**

**5.1 - Go to Project**
```bash
$ cd /Users/samuelraymond/Documents/Family-Housing-Hub
$ pwd
/Users/samuelraymond/Documents/Family-Housing-Hub
✅ Correct directory
```

**5.2 - Initialize Amplify**
```bash
$ amplify init
Note: It is recommended to run this command from the root of your app directory
? Enter a name for the project familyhousinghub
                                ↑ Type this

The following configuration will be used:

Project information
| Name: familyhousinghub
| Environment: dev
| Default editor: Visual Studio Code
| App type: javascript
| Javascript framework: react
| Source Directory Path: src
| Distribution Directory Path: dist
| Build Command: npm run-script build
| Start Command: npm run-script start

? Initialize the project with the above configuration? Yes
                                                      ↑ Type Y

? Select the authentication method you want to use: AWS profile
                                                    ↑ Select this

? Please choose the profile you want to use default
                                            ↑ Select this

⠼ Initializing project in the cloud...

✔ Successfully created initial AWS cloud resources for deployments.
✔ Initialized provider successfully.
✅ Done!
```

---

## 📦 STEP 6: Add S3 Storage (Terminal)

### **What you'll see:**

**6.1 - Add Storage**
```bash
$ amplify add storage
? Select from one of the below mentioned services: 
  NoSQL Database
❯ Content (Images, audio, video, etc.)
  ↑ Select this (press Enter)
```

**6.2 - Configure Storage**
```bash
? Provide a friendly name for your resource that will be used to label this category in the project:
familyStorage
↑ Type this

? Provide bucket name:
familyhousinghub-storage-abc123
↑ Press Enter (accept default)

? Who should have access:
❯ Auth users only
  ↑ Select this

? What kind of access do you want for Authenticated users? 
  (Use arrow keys and spacebar to select)
◉ create/update
◉ read
◉ delete
↑ Select all three (spacebar to check)

? Do you want to add a Lambda Trigger for your S3 Bucket? No
                                                          ↑ Type N
✔ Successfully added resource familyStorage locally
```

**6.3 - Push to AWS**
```bash
$ amplify push
✔ Successfully pulled backend environment dev from the cloud.

    Current Environment: dev
    
┌──────────┬───────────────┬───────────┬───────────────────────┐
│ Category │ Resource name │ Operation │ Provider plugin       │
├──────────┼───────────────┼───────────┼───────────────────────┤
│ Storage  │ familyStorage │ Create    │ awscloudformation     │
└──────────┴───────────────┴───────────┴───────────────────────┘

? Are you sure you want to continue? Yes
                                      ↑ Type Y

⠦ Updating resources in the cloud. This may take a few minutes...

✔ All resources are updated in the cloud

✅ Done! S3 is ready!
```

---

## 📧 STEP 7D: Enable Amazon SES (Email)

### **What you'll see:**

**7D.1 - SES Console**
```
┌─────────────────────────────────────────┐
│  Amazon Simple Email Service            │
├─────────────────────────────────────────┤
│  Left Menu:                            │
│  • Account dashboard                   │
│  • Verified identities  ← CLICK        │
│  • Configuration sets                  │
│  • Email sending                       │
└─────────────────────────────────────────┘
```

**7D.2 - Create Identity**
```
┌─────────────────────────────────────────┐
│  Verified identities                    │
├─────────────────────────────────────────┤
│  [Create identity]  ← CLICK            │
│                                         │
│  No identities yet                      │
└─────────────────────────────────────────┘
```

**7D.3 - Identity Type**
```
┌─────────────────────────────────────────┐
│  Create identity                        │
├─────────────────────────────────────────┤
│  Identity type:                        │
│  (•) Email address  ← SELECT           │
│  ( ) Domain                            │
│                                         │
│  Email address:                        │
│  [kwibesamuel@gmail.com]  ← TYPE       │
│                                         │
│  [Create identity]  ← CLICK            │
└─────────────────────────────────────────┘
```

**7D.4 - Check Your Email**
```
┌─────────────────────────────────────────┐
│  📧 Your Email Inbox                   │
├─────────────────────────────────────────┤
│  From: no-reply-aws@amazon.com         │
│  Subject: Amazon SES Email Verification│
│                                         │
│  Please click this link to verify:     │
│  [Verify your email address]  ← CLICK  │
└─────────────────────────────────────────┘
```

**7D.5 - Verified!**
```
┌─────────────────────────────────────────┐
│  Amazon SES                             │
├─────────────────────────────────────────┤
│  ✅ Email address verified             │
│                                         │
│  kwibesamuel@gmail.com                 │
│  Status: Verified                      │
└─────────────────────────────────────────┘
```

---

## 📦 STEP 8: Install AWS Packages (Terminal)

### **What you'll see:**

```bash
$ npm install @aws-sdk/client-rekognition @aws-sdk/client-polly @aws-sdk/client-transcribe-streaming @aws-sdk/client-ses @aws-sdk/client-sns

npm WARN deprecated...

added 45 packages, and audited 234 packages in 12s

✅ Done!
```

---

## ✅ STEP 9: Verify Everything

### **What you'll see:**

**9.1 - Check Amplify Status**
```bash
$ amplify status

    Current Environment: dev
    
┌──────────┬───────────────┬───────────┬───────────────────────┐
│ Category │ Resource name │ Operation │ Provider plugin       │
├──────────┼───────────────┼───────────┼───────────────────────┤
│ Storage  │ familyStorage │ No Change │ awscloudformation     │
└──────────┴───────────────┴───────────┴───────────────────────┘

✅ Perfect!
```

**9.2 - Check S3 in AWS Console**
```
┌─────────────────────────────────────────┐
│  Amazon S3                              │
├─────────────────────────────────────────┤
│  Buckets:                              │
│  • familyhousinghub-storage-abc123     │
│    ↑ You should see this! ✅           │
└─────────────────────────────────────────┘
```

---

## 🎉 You're Done!

All these steps are complete! Now tell me and I'll integrate everything into your app! 🚀



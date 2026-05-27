# 🚀 Deploy to AWS Amplify - Step by Step

## Why AWS Amplify?

### **Benefits:**
- ✅ **FREE:** 1,000 build minutes/month (ALWAYS FREE)
- ✅ **Faster:** Global CDN included
- ✅ **Better:** Automatic HTTPS, CI/CD
- ✅ **Professional:** Industry-standard hosting
- ✅ **Custom domain:** Free SSL certificate

---

## 📋 Prerequisites

1. ✅ AWS Account (free to create)
2. ✅ Your app built and ready
3. ✅ GitHub account (optional, for CI/CD)

---

## 🎯 Quick Deploy (Manual)

### **Option 1: Deploy via Console (Easiest)**

#### **Step 1: Build your app**
```bash
cd /Users/samuelraymond/Documents/Family-Housing-Hub
npm run build
```

#### **Step 2: Go to AWS Console**
1. Go to: https://console.aws.amazon.com/amplify/
2. Click **"Get Started"** under "Amplify Hosting"
3. Choose **"Deploy without Git provider"**

#### **Step 3: Upload**
1. Drag and drop your `dist` folder
2. Or zip it: `zip -r dist.zip dist/`
3. Upload the zip

#### **Step 4: Done!**
Your app is live on AWS! 🎉

---

## 🔄 Automatic Deploy (CI/CD)

### **Option 2: Connect to GitHub (Recommended)**

#### **Step 1: Push to GitHub**
```bash
cd /Users/samuelraymond/Documents/Family-Housing-Hub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

#### **Step 2: Connect to Amplify**
1. Go to: https://console.aws.amazon.com/amplify/
2. Click **"Get Started"** under "Amplify Hosting"
3. Choose **"GitHub"**
4. Authorize AWS Amplify
5. Select your repository
6. Select `main` branch

#### **Step 3: Configure Build Settings**
Amplify will auto-detect React + Vite. Use this:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

#### **Step 4: Environment Variables**
Add these in Amplify Console:
- `NODE_ENV` = `production`

#### **Step 5: Deploy!**
Click **"Save and deploy"**

**Now every git push automatically deploys!** 🚀

---

## 🌐 Custom Domain

### **Add Your Domain (Free SSL)**

1. Go to Amplify Console
2. Click **"Domain management"**
3. Click **"Add domain"**
4. Enter your domain
5. Follow DNS instructions
6. Wait 5-10 minutes for SSL

**Free HTTPS certificate!** 🔒

---

## ⚙️ Advanced: Amplify CLI

### **Option 3: Use Amplify CLI**

#### **Step 1: Install CLI**
```bash
npm install -g @aws-amplify/cli
```

#### **Step 2: Configure**
```bash
amplify configure
```
Follow prompts to set up AWS credentials.

#### **Step 3: Initialize**
```bash
cd /Users/samuelraymond/Documents/Family-Housing-Hub
amplify init
```

Answer:
- Name: `family-housing-hub`
- Environment: `production`
- Editor: VSCode
- Framework: React
- Build directory: `dist`
- Build command: `npm run build`
- Start command: `npm run dev`

#### **Step 4: Add Hosting**
```bash
amplify add hosting
```

Choose:
- "Hosting with Amplify Console"
- "Manual deployment"

#### **Step 5: Deploy**
```bash
amplify publish
```

**Your app is live!** 🎉

---

## 📊 Monitoring & Analytics

### **Built-in Features:**
- ✅ **Access logs:** See who visits
- ✅ **Performance metrics:** Load times
- ✅ **Error tracking:** Find issues
- ✅ **Traffic stats:** User analytics

All included FREE! 📈

---

## 🔄 Update Your App

### **Manual:**
1. Build: `npm run build`
2. Upload new `dist` folder to Amplify

### **CI/CD:**
1. Commit changes: `git commit -am "Update"`
2. Push: `git push`
3. Amplify auto-deploys! 🚀

---

## 💰 Cost

### **AWS Amplify Pricing:**
- ✅ **FREE:** 1,000 build minutes/month (ALWAYS FREE)
- ✅ **FREE:** 15 GB served/month
- ✅ **FREE:** 5 GB storage

**Your app:** Probably $0/month! 🎉

After free tier:
- **Build minutes:** $0.01/minute (after 1,000)
- **Hosting:** $0.15/GB (after 15 GB)
- **Storage:** $0.023/GB (after 5 GB)

**Likely cost:** $0-2/month (you won't exceed free tier)

---

## 🎯 Comparison

| Feature | Firebase | AWS Amplify |
|---------|----------|-------------|
| **Free builds** | 10/day | 1,000 min/month |
| **Free hosting** | 10 GB/month | 15 GB/month |
| **SSL** | Yes | Yes |
| **Custom domain** | Yes | Yes |
| **CI/CD** | Yes | Yes |
| **Preview URLs** | No | Yes |
| **Analytics** | Limited | Built-in |
| **Always free** | Yes | Yes |

**Winner:** AWS Amplify has MORE features! 🏆

---

## 🚀 Ready to Deploy?

Let me know if you want me to:
1. **Deploy manually** (upload dist folder)
2. **Set up CI/CD** (GitHub auto-deploy)
3. **Use Amplify CLI** (command-line deploy)
4. **Keep Firebase** (and just use AWS for other services)

All options are FREE! 🎉



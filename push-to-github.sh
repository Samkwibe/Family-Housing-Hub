#!/bin/bash

# Script to push changes to GitHub
# Run this after OneDrive finishes syncing

cd "/Users/samuelraymond/Library/CloudStorage/OneDrive-SNHU/SNHU Academic Materials/2025 Fall & Spring/PERSONAL PROJECTS/Family-Housing-Hub"

echo "Checking git status..."
git status

echo ""
echo "Staging all changes..."
git add -A

echo ""
echo "Committing changes..."
git commit -m "Fix messaging system: Handle undefined senderEmail and improve message delivery

- Fixed undefined senderEmail error when user profile doesn't have email
- Improved message filtering to ensure recipients see messages in real-time
- Enhanced message data cleanup to remove undefined fields before sending to Firestore
- Updated message sending logic to handle optional sender fields properly"

echo ""
echo "Pushing to GitHub..."
git push origin main

echo ""
echo "Done! Changes have been pushed to GitHub."






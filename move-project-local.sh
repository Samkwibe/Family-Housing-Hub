#!/bin/bash

# Script to temporarily move project to local directory to avoid OneDrive sync issues

SOURCE_DIR="/Users/samuelraymond/Library/CloudStorage/OneDrive-SNHU/SNHU Academic Materials/2025 Fall & Spring/PERSONAL PROJECTS/Family-Housing-Hub"
DEST_DIR="$HOME/Desktop/Family-Housing-Hub-local"

echo "⚠️  OneDrive sync is causing file access issues."
echo ""
echo "This script will copy your project to a local directory ($DEST_DIR)"
echo "where you can work without OneDrive sync delays."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "📁 Copying project to local directory..."
echo "   Source: $SOURCE_DIR"
echo "   Destination: $DEST_DIR"
echo ""

# Create destination directory
mkdir -p "$DEST_DIR"

# Copy files (excluding node_modules and .git to save time)
echo "Copying files (this may take a moment)..."
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.DS_Store' \
    --exclude 'dist' \
    --exclude 'build' \
    "$SOURCE_DIR/" "$DEST_DIR/"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Project copied successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. cd $DEST_DIR"
    echo "   2. npm install  (to install dependencies)"
    echo "   3. npm run dev  (to start dev server)"
    echo ""
    echo "💡 Tip: When you're done, you can copy changes back to OneDrive if needed."
    echo ""
    read -p "Would you like to install dependencies and start dev server now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$DEST_DIR"
        echo "Installing dependencies..."
        npm install
        if [ $? -eq 0 ]; then
            echo ""
            echo "Starting dev server..."
            npm run dev
        else
            echo "❌ Failed to install dependencies. Please run 'npm install' manually."
        fi
    fi
else
    echo "❌ Failed to copy project. Please try manually."
    exit 1
fi






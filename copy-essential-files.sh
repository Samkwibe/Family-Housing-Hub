#!/bin/bash

# Script to copy only essential files (skip node_modules, .git, and other large dirs)
# Then install dependencies fresh

SOURCE_DIR="/Users/samuelraymond/Library/CloudStorage/OneDrive-SNHU/SNHU Academic Materials/2025 Fall & Spring/PERSONAL PROJECTS/Family-Housing-Hub"
DEST_DIR="$HOME/Desktop/Family-Housing-Hub-local"

echo "🧹 Cleaning up any existing copy..."
rm -rf "$DEST_DIR"

echo "📁 Creating destination directory..."
mkdir -p "$DEST_DIR"

echo "📋 Copying essential files only (this will skip node_modules, .git, etc.)..."
echo ""

# Copy essential files one by one, skipping problematic ones
cd "$SOURCE_DIR"

# Copy config files first (small files)
echo "Copying config files..."
for file in package.json package-lock.json vite.config.js tailwind.config.js postcss.config.js firebase.json firestore.rules firestore.indexes.json storage.rules .firebaserc .env.local index.html; do
    if [ -f "$file" ]; then
        echo "  Copying $file..."
        cp "$file" "$DEST_DIR/" 2>/dev/null || echo "    ⚠️  Skipped $file (OneDrive sync issue)"
    fi
done

# Copy public folder if it exists
if [ -d "public" ]; then
    echo "Copying public folder..."
    cp -r public "$DEST_DIR/" 2>/dev/null || echo "  ⚠️  Skipped public folder"
fi

# Copy src folder
echo "Copying src folder..."
if [ -d "src" ]; then
    mkdir -p "$DEST_DIR/src"
    # Try to copy src recursively, but skip if it times out
    find src -type f -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.css" | while read file; do
        mkdir -p "$DEST_DIR/$(dirname "$file")"
        cp "$file" "$DEST_DIR/$file" 2>/dev/null || echo "    ⚠️  Skipped $file"
    done
fi

# Copy README and other docs
echo "Copying documentation..."
for file in README.md MESSAGING_FEATURES.md QUICK_FIX.md; do
    if [ -f "$file" ]; then
        cp "$file" "$DEST_DIR/" 2>/dev/null || echo "  ⚠️  Skipped $file"
    fi
done

echo ""
echo "✅ Essential files copied!"
echo ""
echo "📦 Installing dependencies (this will download fresh from npm)..."
cd "$DEST_DIR"

if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Dependencies installed successfully!"
        echo ""
        echo "🚀 Starting dev server..."
        npm run dev
    else
        echo "❌ Failed to install dependencies."
        echo "You can try manually: cd $DEST_DIR && npm install"
    fi
else
    echo "❌ package.json not found. The copy may have failed due to OneDrive sync."
    echo "Please wait for OneDrive to finish syncing and try again."
fi





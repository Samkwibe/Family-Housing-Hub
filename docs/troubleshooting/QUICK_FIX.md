# Quick Fix for OneDrive Sync Issues

## The Problem
OneDrive is causing file access timeouts when npm tries to read `package.json` and other files. This happens because OneDrive needs to sync files from the cloud before they can be accessed.

## Solutions (in order of preference):

### Solution 1: Make Files Always Available (Best)
1. Open Finder
2. Navigate to your project folder
3. Right-click on the folder
4. Select "Always Keep on This Device" (or "Make Available Offline")
5. Wait for OneDrive to download all files (check OneDrive icon in menu bar)
6. Once complete, run: `npm run dev`

### Solution 2: Wait for Sync
1. Check OneDrive status in menu bar
2. Wait until all files show as synced (no spinning icons)
3. Run: `npm run dev`

### Solution 3: Use the Helper Script
Run the script I created:
```bash
./run-dev.sh
```
This will wait for files to be accessible before starting the dev server.

### Solution 4: Move Project Temporarily (If urgent)
If you need to work immediately:
```bash
# Move project to a local directory (outside OneDrive)
mv "/Users/samuelraymond/Library/CloudStorage/OneDrive-SNHU/SNHU Academic Materials/2025 Fall & Spring/PERSONAL PROJECTS/Family-Housing-Hub" ~/Desktop/Family-Housing-Hub-temp

# Work on it there
cd ~/Desktop/Family-Housing-Hub-temp
npm run dev

# When done, move it back (or keep it there)
```

## Why This Happens
OneDrive syncs files on-demand. When npm tries to read `package.json`, OneDrive may need to download it from the cloud first, causing a timeout if the connection is slow or the file isn't cached locally.

## Prevention
- Always use "Always Keep on This Device" for active development projects
- Or move development projects outside of OneDrive to a local directory
- Consider using Git for version control instead of relying on OneDrive for code projects






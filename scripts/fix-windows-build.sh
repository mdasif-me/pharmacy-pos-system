#!/bin/bash

# Script to fix better-sqlite3 for Windows builds
# This downloads the pre-built Windows binary

echo "==================================================================="
echo "  Fixing better-sqlite3 for Windows Build"
echo "==================================================================="

# Get electron version
ELECTRON_VERSION=$(node -p "require('./package.json').devDependencies.electron.replace(/[^0-9.]/g, '')")
NODE_ABI=$(node -p "require('electron-to-chromium/versions').electronToChromium('$ELECTRON_VERSION')")

echo "Electron version: $ELECTRON_VERSION"

# Download Windows binary for better-sqlite3
echo ""
echo "Downloading better-sqlite3 Windows binary..."

cd node_modules/better-sqlite3

# Remove Linux binary
rm -f build/Release/better_sqlite3.node

# Download Windows x64 binary
SQLITE_VERSION=$(node -p "require('./package.json').version")
echo "better-sqlite3 version: $SQLITE_VERSION"

# Use npx to rebuild for Windows
echo ""
echo "Rebuilding for Windows..."
npx --yes @electron/rebuild \
  --force \
  --types prod \
  --module-dir . \
  --which-module better-sqlite3 \
  --arch x64 \
  --platform win32 \
  --electron-version $ELECTRON_VERSION

cd ../..

echo ""
echo "==================================================================="
echo "  ✓ Done! Now run: npm run dist:win"
echo "==================================================================="

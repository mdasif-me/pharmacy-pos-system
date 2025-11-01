#!/bin/bash
# Script to download Windows pre-built binaries for better-sqlite3

set -e

echo "=============================================="
echo "Downloading Windows binaries for native modules"
echo "=============================================="

# Remove existing node_modules to start fresh
echo "Removing existing node_modules..."
rm -rf node_modules

# Install dependencies
echo "Installing dependencies..."
npm install

# Download Windows binaries for better-sqlite3
echo "Downloading better-sqlite3 Windows binary..."
cd node_modules/better-sqlite3

# Use npm to rebuild for Windows
npx --yes prebuild-install --platform=win32 --arch=x64 --runtime=electron --target=32.1.2 || true

# If prebuild-install fails, download manually
if [ ! -f "build/Release/better_sqlite3.node" ] || file build/Release/better_sqlite3.node | grep -q "ELF"; then
    echo "Manual download of Windows binary..."
    
    # Create build directory
    mkdir -p build/Release
    
    # Download Windows pre-built binary from GitHub releases
    BETTER_SQLITE3_VERSION=$(node -p "require('./package.json').version")
    echo "better-sqlite3 version: $BETTER_SQLITE3_VERSION"
    
    DOWNLOAD_URL="https://github.com/WiseLibs/better-sqlite3/releases/download/v${BETTER_SQLITE3_VERSION}/better-sqlite3-v${BETTER_SQLITE3_VERSION}-electron-v32.1-win32-x64.tar.gz"
    
    echo "Downloading from: $DOWNLOAD_URL"
    curl -L "$DOWNLOAD_URL" -o windows-binary.tar.gz
    
    # Extract the Windows .node file
    tar -xzf windows-binary.tar.gz -C build/Release/
    rm windows-binary.tar.gz
fi

cd ../..

echo ""
echo "✅ Windows binaries installed!"
echo ""
echo "Now rebuild the app:"
echo "  npm run transpile:electron"
echo "  npm run build"
echo "  npm run dist:win"

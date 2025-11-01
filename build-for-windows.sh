#!/bin/bash

echo "=========================================="
echo "Building Windows Installer from Ubuntu"
echo "=========================================="
echo ""

# Step 1: Transpile Electron code
echo "Step 1/3: Transpiling Electron code..."
npm run transpile:electron
if [ $? -ne 0 ]; then
    echo "❌ Failed to transpile Electron code"
    exit 1
fi
echo "✅ Electron code transpiled"
echo ""

# Step 2: Build React frontend
echo "Step 2/3: Building React frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build React frontend"
    exit 1
fi
echo "✅ React frontend built"
echo ""

# Step 3: Build Windows installer
echo "Step 3/3: Building Windows installer..."
npm run dist:win
if [ $? -ne 0 ]; then
    echo "❌ Failed to build Windows installer"
    exit 1
fi
echo "✅ Windows installer built successfully!"
echo ""

echo "=========================================="
echo "✅ BUILD COMPLETE!"
echo "=========================================="
echo ""
echo "Your Windows installer is ready at:"
echo "  📦 release-windows/"
echo ""
echo "Files you can send to your client:"
ls -lh release-windows/*.exe 2>/dev/null || echo "  - Portable EXE (no installer)"
echo ""
echo "Send these files to your Windows PC!"
echo "=========================================="

#!/bin/bash

echo "=============================================="
echo "🚀 Building Windows Installer from Ubuntu"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Docker image
echo -e "${BLUE}Step 1/3: Building Docker image...${NC}"
echo "This may take 5-10 minutes on first run (downloads Windows build tools)"
echo ""

docker build -f Dockerfile.windows -t pharmacy-pos-windows .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Docker image built successfully!${NC}"
echo ""

# Step 2: Run the build
echo -e "${BLUE}Step 2/3: Building Windows installer...${NC}"
echo "This will take 3-5 minutes"
echo ""

docker run --rm -v $(pwd)/release-windows:/project/release-windows pharmacy-pos-windows

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Windows build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Windows app built successfully!${NC}"
echo ""

# Step 3: Create ZIP for distribution
echo -e "${BLUE}Step 3/3: Creating ZIP package...${NC}"
echo ""

cd release-windows/win-unpacked
zip -r ../Pharmacy-POS-Windows-Portable.zip * > /dev/null 2>&1
cd ../..

if [ -f "release-windows/Pharmacy-POS-Windows-Portable.zip" ]; then
    SIZE=$(du -h release-windows/Pharmacy-POS-Windows-Portable.zip | cut -f1)
    echo -e "${GREEN}✅ ZIP created: $SIZE${NC}"
else
    echo -e "${RED}⚠️  Failed to create ZIP (build files still available)${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 BUILD COMPLETE!${NC}"
echo "=============================================="
echo ""
echo "📦 Your Windows installer is ready:"
echo "   📁 Folder: release-windows/win-unpacked/"
echo "   📦 ZIP:    release-windows/Pharmacy-POS-Windows-Portable.zip"
echo ""
echo "📤 To give to your client:"
echo "   1. Copy the ZIP file to a pendrive"
echo "   2. Extract on Windows PC"
echo "   3. Run 'Pharmacy POS.exe'"
echo ""
echo "🔄 To build again: ./build-windows.sh"
echo "=============================================="

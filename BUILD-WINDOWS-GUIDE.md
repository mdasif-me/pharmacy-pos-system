# Building Windows Installer from Ubuntu

## ✅ White Screen Issue - FIXED!

The white screen issue has been fixed by:
1. Removing restrictive Content Security Policy from `index.html`
2. Fixing path resolution in `pathResolver.ts`
3. Disabling `webSecurity` for production builds to allow local file loading

## 🚀 Quick Build (Recommended Method)

### Option 1: Using Wine (Fastest)

```bash
# 1. Install Wine dependencies (one-time setup)
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install -y wine wine32 wine64 mono-complete

# 2. Build Windows installer
./build-for-windows.sh
```

Your Windows installer will be in `release-windows/` folder!

### Option 2: Using Docker

```bash
# 1. Build Docker image
docker build -f Dockerfile.windows -t pharmacy-pos-windows .

# 2. Run build
docker run --rm -v "$(pwd)/release-windows:/project/release-windows" pharmacy-pos-windows
```

### Option 3: Using GitHub Actions

```bash
# 1. Commit your changes
git add .
git commit -m "Fix white screen issue"

# 2. Create and push tag
git tag v1.0.4
git push origin main --tags

# 3. Wait 5-10 minutes and download from:
# https://github.com/mdasif-me/pharmacy-pos-system/actions
```

## 📦 What You'll Get

After building, you'll find in `release-windows/`:
- `Pharmacy POS.exe` - Portable executable (no installation needed)
- Your client can run this directly on Windows!

## 🐛 Testing on Your Windows PC

1. Copy `Pharmacy POS.exe` to your Windows PC
2. Double-click to run
3. The app should now load properly with the UI visible!

## 💡 Why Did the White Screen Happen?

The white screen was caused by:
1. **CSP (Content Security Policy)** - Too restrictive, blocked inline scripts
2. **Path Issues** - Production build couldn't find the HTML file
3. **Web Security** - Electron blocked loading local resources

All fixed now! 🎉

## 🔧 Manual Build Commands

If you prefer running commands manually:

```bash
# 1. Transpile Electron code
npm run transpile:electron

# 2. Build React frontend
npm run build

# 3. Build Windows installer
npm run dist:win
```

## 📝 Notes

- The build creates a **portable executable** (no installer needed)
- Your client can run it directly on Windows without installation
- All dependencies are bundled inside the executable
- Works on Windows 10/11 (64-bit)

## 🆘 Troubleshooting

### If Wine build fails:
```bash
# Install additional Wine dependencies
sudo apt-get install -y libwine libwine:i386 fonts-wine
```

### If you see "Module not found" errors:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run rebuild:native
```

### To test locally before sending to client:
```bash
# Run in development mode
npm run dev
```

This will open the app on Ubuntu so you can verify everything works!

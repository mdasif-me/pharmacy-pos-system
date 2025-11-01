# Build Windows Installer from Ubuntu

## 🎯 Problem

You only have Ubuntu PC, but need to create Windows .exe for clients.

## ✅ SOLUTION 1: Use GitHub Actions (EASIEST - No Windows PC Needed!)

This is **100% FREE** and **AUTOMATED**. GitHub will build your Windows app for you!

### Step 1: Push to GitHub (if not already)

```bash
# Initialize git (if not done)
git init

# Add GitHub remote (replace with YOUR repo)
git remote add origin https://github.com/mdasif-me/pharmacy-pos-system.git

# Add all files
git add .

# Commit
git commit -m "Add Windows build workflow"

# Push to GitHub
git push -u origin main
```

### Step 2: The Workflow is Already Created!

I already created `.github/workflows/build-windows.yml` for you!

### Step 3: Trigger the Build

**Option A: Push a version tag**

```bash
git tag v1.0.1
git push origin v1.0.1
```

**Option B: Manual trigger**

1. Go to: https://github.com/mdasif-me/pharmacy-pos-system/actions
2. Click "Build Windows Installer"
3. Click "Run workflow" button
4. Wait 5-10 minutes

### Step 4: Download Your Windows Build

1. Go to the workflow run page
2. Scroll to "Artifacts" section at bottom
3. Download `windows-portable-zip`
4. Extract and give to your client!

**That's it!** ✨ No Windows PC needed!

---

## ✅ SOLUTION 2: Use Docker (Works on Ubuntu)

This builds Windows app directly on your Ubuntu using Docker.

### Step 1: Install Docker (if not installed)

```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io

# Add your user to docker group (no need for sudo)
sudo usermod -aG docker $USER

# Logout and login again, or run:
newgrp docker

# Verify Docker works
docker --version
```

### Step 2: Build Windows App with Docker

```bash
# Build the Docker image (first time only, takes 5-10 minutes)
docker build -f Dockerfile.windows -t pharmacy-pos-windows .

# Build your Windows app (takes 3-5 minutes)
docker run --rm -v $(pwd)/release-windows:/project/release-windows pharmacy-pos-windows
```

### Step 3: Get Your Windows Installer

```bash
# Your Windows build is ready!
ls -lh release-windows/win-unpacked/

# Create ZIP for client
cd release-windows/win-unpacked
zip -r ../Pharmacy-POS-Windows.zip *
cd ../..
```

Done! Send `release-windows/Pharmacy-POS-Windows.zip` to your client.

---

## ✅ SOLUTION 3: Install Wine on Ubuntu (Advanced)

Wine lets Ubuntu run Windows build tools. This is more complex but works.

### Step 1: Install Wine

```bash
# Enable 32-bit architecture
sudo dpkg --add-architecture i386

# Update package list
sudo apt-get update

# Install Wine
sudo apt-get install -y wine64 wine32 winetricks

# Verify installation
wine64 --version
```

### Step 2: Install Windows Node.js in Wine

```bash
# Download Windows Node.js installer
wget https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi

# Install it with Wine
wine64 msiexec /i node-v18.18.0-x64.msi
```

### Step 3: Clean and Rebuild

```bash
# Remove Linux node_modules
rm -rf node_modules

# Install with Wine's Node.js
wine64 npm install

# Build for Windows
wine64 npm run dist:win
```

⚠️ **Note**: Wine method is complex and may have issues. **Use GitHub Actions or Docker instead!**

---

## 📊 Comparison

| Method             | Difficulty      | Speed           | Reliability     |
| ------------------ | --------------- | --------------- | --------------- |
| **GitHub Actions** | ⭐ Easiest      | Fast (5-10 min) | ⭐⭐⭐⭐⭐ Best |
| **Docker**         | ⭐⭐ Easy       | Fast (3-5 min)  | ⭐⭐⭐⭐ Good   |
| **Wine**           | ⭐⭐⭐⭐⭐ Hard | Slow (15+ min)  | ⭐⭐ Unreliable |

---

## 🚀 RECOMMENDED: Use GitHub Actions!

**Why GitHub Actions is BEST for you:**

✅ **No installation needed** - Works immediately  
✅ **100% Free** - For public AND private repos  
✅ **Always works** - Real Windows environment  
✅ **Automated** - Just push code and get builds  
✅ **No system pollution** - Doesn't touch your Ubuntu  
✅ **Multiple builds** - Can build Windows, Mac, Linux simultaneously

### Quick Start with GitHub Actions:

```bash
# 1. Make sure code is committed
git add .
git commit -m "Ready for Windows build"

# 2. Push to GitHub
git push origin main

# 3. Create a version tag
git tag v1.0.1
git push origin v1.0.1

# 4. Go to GitHub Actions page and download the build!
```

**In 5 minutes, you'll have a perfect Windows installer!** 🎉

---

## 🐛 Troubleshooting

### If GitHub Actions Fails

Check the error in Actions tab. Common issues:

- **Node version**: Change to `node-version: '18'` in workflow file
- **Build errors**: Make sure `npm run build` works locally
- **Permissions**: Make sure repo has Actions enabled in Settings

### If Docker Fails

```bash
# Check Docker is running
sudo systemctl status docker

# If not running, start it
sudo systemctl start docker

# Rebuild image
docker build -f Dockerfile.windows -t pharmacy-pos-windows . --no-cache
```

### If Wine Fails

**Don't waste time with Wine!** Use GitHub Actions or Docker instead. Wine is complex and error-prone.

---

## 💡 Best Practice Workflow

**For Regular Development:**

```bash
# Develop on Ubuntu
npm run dev

# Test locally
npm run build
npm start
```

**When Ready for Client:**

```bash
# Commit your changes
git add .
git commit -m "Version 1.0.1 - Added new features"

# Create version tag
git tag v1.0.1

# Push to GitHub (this triggers Windows build automatically!)
git push origin main --tags

# Wait 5 minutes, download from GitHub Actions, send to client!
```

**Perfect workflow!** No Windows PC needed, ever! 🚀

---

## 🎓 Additional Tips

### Automatically Build on Every Push

The workflow I created will build whenever you push a tag (v1.0.1, v1.0.2, etc.)

### Build for Multiple Platforms

You can extend the workflow to build for Linux and Mac too:

```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    # ... rest of build steps
```

### Use Release Pages

When you push a tag, GitHub Actions will automatically create a Release with downloadable files at:
`https://github.com/mdasif-me/pharmacy-pos-system/releases`

Your clients can download directly from there! No need to send files manually.

---

## ✅ Summary

**You have 3 options, but GitHub Actions is BEST:**

1. **GitHub Actions** ⭐ RECOMMENDED

   - Push code → Wait 5 min → Download Windows build
   - No installation, always works, 100% free

2. **Docker** ⭐ Good alternative

   - Install Docker → Run build → Get Windows .exe
   - Works offline, faster than Wine

3. **Wine** ❌ Not recommended
   - Complex, unreliable, slow
   - Only use as last resort

**Start with GitHub Actions!** It's literally the easiest solution. 🎉

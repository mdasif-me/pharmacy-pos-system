# 🔧 Windows PC তে Production Build সমস্যা সমাধান

## ✅ আমি যা ঠিক করেছি:

### 1. **Path Resolution**

- Production build এ সঠিক path খুঁজে পাওয়ার জন্য multiple location check করছে
- ASAR unpacked, resources folder সব জায়গায় check করবে

### 2. **Vite Configuration**

- Assets directory properly configure করেছি
- Manual chunks disable করেছি Electron এর জন্য

### 3. **Debugging Tools**

- Production build এও DevTools খুলবে error দেখার জন্য
- Console logs add করেছি path tracking এর জন্য

### 4. **Electron Builder Config**

- `asarUnpack` add করেছি dist-react folder এর জন্য
- File patterns properly configure করেছি

## 🚀 Windows PC তে করুন:

### Step 1: Latest Code Pull করুন

```bash
git pull origin main
```

### Step 2: Clean Build করুন

```bash
# পুরাতন build files মুছে ফেলুন
rmdir /s /q dist-react
rmdir /s /q dist-electron
rmdir /s /q release-windows

# নতুন করে dependencies install করুন (optional, but recommended)
npm install
```

### Step 3: Build করুন

```bash
npm run build:win
```

এই একটি command সব কিছু করবে:

1. Electron code transpile করবে
2. React frontend build করবে
3. Windows installer তৈরি করবে

### Step 4: Test করুন

Build হওয়ার পর `release-windows` folder এ যান এবং `Pharmacy POS.exe` run করুন।

**এখন যা হবে:**

- ✅ App open হবে
- ✅ DevTools automatically open হবে (console check করার জন্য)
- ✅ Console এ path logs দেখবেন
- ✅ UI load হবে (white screen থাকবে না!)

## 🔍 যদি এখনও সমস্যা হয়:

### DevTools Console Check করুন:

App open করার পর DevTools automatically খুলবে। Console tab এ দেখুন:

**খুঁজুন:**

- `[PathResolver] Using ... path:` - কোন path ব্যবহার করছে
- `[Main] ✓ index.html exists` - file পাওয়া গেছে কিনা
- Any red errors - কোনো JavaScript error আছে কিনা

### Common Issues:

**যদি এখনও white screen থাকে:**

1. Console এ `Failed to load resource` error দেখুন
2. Network tab এ দেখুন কোন file 404 হচ্ছে কিনা
3. Screenshot/error message share করুন

**যদি "index.html NOT FOUND" দেখেন:**

```bash
# Ensure dist-react folder আছে
npm run build
```

## 📸 Error Report করতে:

যদি এখনও কাজ না করে, DevTools console এর screenshot share করুন:

1. App run করুন
2. DevTools open হবে automatically
3. Console tab এর screenshot নিন
4. Share করুন

## 🎯 Expected Output:

Console এ দেখবেন:

```
[Main] ========== APP STARTING ==========
[Main] Platform: win32
[PathResolver] Using ... path: C:\...\dist-react
[Main] UI Path: C:\...\dist-react
[Main] Index Path: C:\...\dist-react\index.html
[Main] ✓ index.html exists
[Main] Page finished loading successfully
```

তারপর UI load হবে! 🎉

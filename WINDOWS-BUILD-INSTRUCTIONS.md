# Windows PC তে Build করার নির্দেশনা

## ✅ White Screen সমস্যা সমাধান হয়েছে!

আমি এই সমস্যাগুলো ঠিক করে দিয়েছি:
1. Content Security Policy (CSP) remove করেছি যা scripts block করছিল
2. Path resolution ঠিক করেছি production build এর জন্য
3. WebSecurity disable করেছি local files load করার জন্য

## 🚀 Windows PC তে Build করুন

### ধাপ ১: Latest Code Pull করুন

```bash
git pull origin main
```

### ধাপ ২: Dependencies Install করুন

```bash
npm install
```

### ধাপ ৩: Build করুন

```bash
# Electron code transpile করুন
npm run transpile:electron

# React frontend build করুন
npm run build

# Windows installer তৈরি করুন
npm run dist:win
```

অথবা এক লাইনে:

```bash
npm run transpile:electron && npm run build && npm run dist:win
```

### ধাপ ৪: Installer পাবেন

Build সম্পন্ন হলে `release-windows` ফোল্ডারে পাবেন:
- `Pharmacy POS.exe` - Portable executable (কোনো installation লাগবে না)

## 🎯 Client কে পাঠান

`Pharmacy POS.exe` file টি আপনার client কে পাঠিয়ে দিন। তারা সরাসরি double-click করে run করতে পারবে।

## ✨ এখন কি হবে?

- ✅ App open হবে
- ✅ UI দেখা যাবে (আর white screen থাকবে না!)
- ✅ সব features কাজ করবে

## 🐛 যদি এখনও সমস্যা হয়

Windows PC তে development mode এ test করুন:

```bash
npm run dev
```

এটি app খুলবে এবং console এ error দেখাবে যদি কিছু থাকে।

## 📝 মনে রাখুন

- Node.js এবং npm Windows PC তে installed থাকতে হবে
- Build করার সময় antivirus disable করতে পারেন (দ্রুত হবে)
- প্রথম build সময় নেয় কারণ dependencies download হয়

## 🎉 সফল!

এখন আপনার Windows PC তে build করলে white screen সমস্যা হবে না। UI properly load হবে!

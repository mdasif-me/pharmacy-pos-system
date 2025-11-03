# 🏥 Pharmacy POS System

A complete Point of Sale system for pharmacy management with inventory tracking, sales processing, and real-time synchronization.

## ✨ Features

- 📦 **Inventory Management** - Track products, stock levels, and categories
- 💰 **Sales Processing** - POS interface for quick sales transactions
- 🔄 **Real-time Sync** - Synchronize data across multiple devices
- 📊 **Reporting** - Sales and inventory reports
- 🌐 **Offline-First** - Works offline, syncs when online
- 👥 **Multi-User** - Support for multiple users with authentication
- 🏷️ **Pricing Modes** - Discount and peak-hour pricing
- 🔔 **Stock Alerts** - Low stock notifications

## 🚀 Quick Start

### For Windows Users (Installation)

1. **Download** the installer: `Pharmacy POS-Setup-1.0.0.exe`
2. **Double-click** the installer file
3. **Follow** the installation wizard
4. **Launch** the app from Desktop or Start Menu

That's it! No technical knowledge required.

### For Developers

See detailed guides:

- [BUILD_WINDOWS.md](BUILD_WINDOWS.md) - Building Windows installer
- [docs/](docs/) - Technical documentation

## 🛠️ Building the Windows Installer

### On Ubuntu (Cross-Platform Build)

```bash
# One-command build
./build-windows-installer.sh

# Or step-by-step
npm install
npm run build:win
```

### On Windows

```cmd
REM One-command build
build-windows-installer.bat

REM Or step-by-step
npm install
npm run build:win
```

The installer will be created at: `release-windows/Pharmacy POS-Setup-1.0.0.exe`

## 📋 System Requirements

### For Users

- **OS:** Windows 7/8/10/11 (64-bit)
- **RAM:** 4GB minimum
- **Disk:** 500MB free space
- **Internet:** Required for sync features

### For Developers

- **Node.js:** 18 or higher
- **npm:** 8 or higher
- **OS:** Ubuntu 20.04+ / Windows 10+ / macOS 12+

## 🏗️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build Windows installer
npm run build:win

# Run tests
npm run test:e2e
```

## 📦 Technologies

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Electron 32, Node.js
- **Database:** SQLite (better-sqlite3)
- **Real-time:** Socket.IO
- **UI Components:** React Select, Recharts
- **Build:** electron-builder with NSIS

## 📁 Project Structure

```
pharmacy-pos/
├── src/
│   ├── electron/          # Electron main process
│   │   ├── database/      # SQLite database layer
│   │   ├── ipc/           # IPC handlers
│   │   └── services/      # Business logic
│   └── ui/                # React frontend
│       ├── components/    # UI components
│       ├── hooks/         # Custom React hooks
│       └── services/      # Frontend services
├── build/                 # Build resources (icons, etc.)
├── docs/                  # Documentation
├── release-windows/       # Build output
└── electron-builder.json  # Build configuration
```

## 🔧 Configuration

### Database

Located at: `%APPDATA%/Pharmacy POS/pharmacy-pos.db` (Windows)

### API Configuration

Edit `src/electron/core/config/api.config.ts`:

```typescript
export const API_CONFIG = {
  baseURL: 'https://beta-api.mediboy.org/api',
  timeout: 30000,
}
```

## 📝 Scripts

| Command                      | Description                 |
| ---------------------------- | --------------------------- |
| `npm run dev`                | Start development server    |
| `npm run build`              | Build production bundle     |
| `npm run build:win`          | Build Windows installer     |
| `npm run transpile:electron` | Compile Electron TypeScript |
| `npm run test:e2e`           | Run E2E tests               |
| `npm run rebuild:native`     | Rebuild native modules      |

## 🐛 Troubleshooting

### "Cannot find module 'better-sqlite3'"

```bash
npm run rebuild:native
```

### Build fails on Ubuntu

Install build tools:

```bash
sudo apt install build-essential
```

### Installer shows "Unknown Publisher"

This is normal without code signing. Users can safely proceed.

## 📄 License

See [LICENSE.txt](LICENSE.txt)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues and questions:

- Create an issue on GitHub
- Check the [documentation](docs/)
- Review [BUILD_WINDOWS.md](BUILD_WINDOWS.md) for build help

## 🎯 Roadmap

- [ ] Multi-language support
- [ ] Barcode scanning
- [ ] Receipt printing
- [ ] Advanced reporting
- [ ] Mobile app integration
- [ ] Cloud backup

---

**Built with ❤️ for Pharmacy Management**

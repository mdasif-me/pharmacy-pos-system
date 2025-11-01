#!/usr/bin/env node

/**
 * Rebuild native modules for Windows target platform
 * This script runs after electron-builder packs the app
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

exports.default = async function (context) {
  const appOutDir = context.appOutDir
  const platform = context.electronPlatformName

  console.log(`[AfterPack] Platform: ${platform}`)
  console.log(`[AfterPack] Output directory: ${appOutDir}`)

  // Only rebuild for Windows builds
  if (platform !== 'win32') {
    console.log('[AfterPack] Not Windows, skipping native rebuild')
    return
  }

  console.log('[AfterPack] Rebuilding native modules for Windows...')

  const resourcesPath = path.join(appOutDir, 'resources', 'app.asar.unpacked')

  if (!fs.existsSync(resourcesPath)) {
    console.log('[AfterPack] No unpacked resources found, checking app.asar...')
    return
  }

  try {
    // Rebuild better-sqlite3 for Windows
    const rebuildCmd = `npx --yes @electron/rebuild --force --types prod,optional --module-dir "${resourcesPath}" --arch x64 --platform win32`

    console.log('[AfterPack] Running:', rebuildCmd)
    execSync(rebuildCmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })

    console.log('[AfterPack] ✓ Native modules rebuilt for Windows')
  } catch (error) {
    console.error('[AfterPack] ✗ Failed to rebuild native modules:', error.message)
    console.error('[AfterPack] Build will continue, but app may not work properly')
  }
}

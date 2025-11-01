import { app } from 'electron'
import path from 'path'
import { isDev } from './util.js'

export function getPreloadPath() {
  if (isDev()) {
    return path.join(app.getAppPath(), 'dist-electron', 'preload.cjs')
  }

  // Production: preload MUST be unpacked from asar
  const fs = require('fs')
  const possiblePaths = [
    // First try unpacked location (this should work)
    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist-electron', 'preload.cjs'),
    // Try in asar (might not work on Windows)
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'preload.cjs'),
    // Try direct app path
    path.join(process.resourcesPath, 'app', 'dist-electron', 'preload.cjs'),
    // Fallback to app path
    path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
  ]

  console.log('[PathResolver] Searching for preload.cjs...')
  for (const preloadPath of possiblePaths) {
    console.log('[PathResolver] Checking:', preloadPath)
    if (fs.existsSync(preloadPath)) {
      console.log('[PathResolver] ✓ Found preload at:', preloadPath)
      return preloadPath
    }
  }

  // Fallback - should not reach here
  const fallbackPath = path.join(app.getAppPath(), 'dist-electron', 'preload.cjs')
  console.error('[PathResolver] ✗ Preload not found anywhere! Using fallback:', fallbackPath)
  console.error('[PathResolver] process.resourcesPath:', process.resourcesPath)
  console.error('[PathResolver] app.getAppPath():', app.getAppPath())
  return fallbackPath
}

export function getUIPath() {
  if (isDev()) {
    return path.join(app.getAppPath(), 'dist-react')
  }

  // Production: check both asar and unpacked locations
  const asarPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist-react')
  const unpackedPath = path.join(process.resourcesPath, 'app', 'dist-react')
  const appPath = path.join(app.getAppPath(), 'dist-react')

  // Try different possible paths
  const fs = require('fs')
  if (fs.existsSync(asarPath)) {
    console.log('[PathResolver] Using asar unpacked path:', asarPath)
    return asarPath
  } else if (fs.existsSync(unpackedPath)) {
    console.log('[PathResolver] Using unpacked path:', unpackedPath)
    return unpackedPath
  } else {
    console.log('[PathResolver] Using app path:', appPath)
    return appPath
  }
}

export function getAssetPath() {
  return path.join(app.getAppPath(), isDev() ? '.' : '..', '/src/assets')
}

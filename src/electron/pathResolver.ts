import { app } from 'electron'
import path from 'path'
import { isDev } from './util.js'

export function getPreloadPath() {
  if (isDev()) {
    return path.join(app.getAppPath(), 'dist-electron', 'preload.cjs')
  }

  // Production: try multiple possible locations
  const fs = require('fs')
  const possiblePaths = [
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'preload.cjs'),
    path.join(process.resourcesPath, 'app', 'dist-electron', 'preload.cjs'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
  ]

  for (const preloadPath of possiblePaths) {
    if (fs.existsSync(preloadPath)) {
      console.log('[PathResolver] Using preload path:', preloadPath)
      return preloadPath
    }
  }

  // Fallback
  const fallbackPath = path.join(app.getAppPath(), 'dist-electron', 'preload.cjs')
  console.error('[PathResolver] Preload not found, using fallback:', fallbackPath)
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

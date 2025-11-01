// database.config.ts - Database configuration

import { app } from 'electron'
import path from 'path'

export const DATABASE_CONFIG = {
  path: path.join(app.getPath('userData'), 'pharmacy-pos.db'),
  verbose: process.env.NODE_ENV === 'development',
}

/**
 * sqlite database manager for pharmacy pos system
 * handles database connection, initialization, and basic operations
 */

import { app } from 'electron';
import path from 'path';
import Database from 'sqlite3';
import {
    alterProductsTableStatements,
    createAuthTokensTable,
    createIndices,
    createProductsTable,
    createSyncStatusTable
} from './schema.js';

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // store database in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'pharmacy-pos.db');
  }

  /**
   * initialize database connection and create tables
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new Database.Database(this.dbPath, (err) => {
        if (err) {
          console.error('database connection failed:', err);
          reject(err);
          return;
        }

        console.log('database connected successfully');
        this.createTables()
          .then(() => resolve())
          .catch((error) => reject(error));
      });
    });
  }

  /**
   * create all required tables and indices
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('database not initialized');

    const tables = [
      createProductsTable,
      createAuthTokensTable, 
      createSyncStatusTable
    ];

    for (const tableSQL of tables) {
      await this.run(tableSQL);
    }

    // ensure new columns exist on products table
    for (const alterSQL of alterProductsTableStatements) {
      try {
        await this.run(alterSQL);
      } catch (error: any) {
        const message = error?.message ?? '';
        if (typeof message === 'string' && message.includes('duplicate column name')) {
          // column already exists, ignore
          continue;
        }
        console.error('failed to alter products table:', error);
      }
    }

    // create indices for better performance
    for (const indexSQL of createIndices) {
      await this.run(indexSQL);
    }

    console.log('all database tables created successfully');
  }

  /**
   * run sql statement with parameters
   */
  async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('database not initialized'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('sql execution failed:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * get single row from database
   */
  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('sql query failed:', err);
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  /**
   * get all rows from database
   */
  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('sql query failed:', err);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          console.error('database close failed:', err);
          reject(err);
        } else {
          console.log('database connection closed');
          resolve();
        }
      });
    });
  }

  /**
   * get database instance for direct access
   */
  getDatabase(): Database.Database | null {
    return this.db;
  }
}

// singleton instance for app-wide use
export const dbManager = new DatabaseManager();
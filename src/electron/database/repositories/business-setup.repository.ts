import { Database } from 'better-sqlite3'

export interface BusinessSetupEntity {
  id: number
  sale_mode: number // 0 = discount, 1 = peak-hour
  bill_mode: number // 0 = discount, 1 = peak-hour
  sync_at: string | null
}

export class BusinessSetupRepository {
  private tableName = 'business_setups'

  constructor(private db: Database) {}

  /**
   * Get the business setup (should only be one row)
   */
  getSetup(): BusinessSetupEntity | undefined {
    return this.db.prepare(`SELECT * FROM ${this.tableName} LIMIT 1`).get() as
      | BusinessSetupEntity
      | undefined
  }

  /**
   * Update sale mode
   */
  updateSaleMode(saleMode: number, syncAt: string): void {
    this.db
      .prepare(
        `
      UPDATE ${this.tableName} 
      SET sale_mode = ?, sync_at = ?
      WHERE id = 1
    `
      )
      .run(saleMode, syncAt)
  }

  /**
   * Update bill mode
   */
  updateBillMode(billMode: number): void {
    this.db
      .prepare(
        `
      UPDATE ${this.tableName} 
      SET bill_mode = ?
      WHERE id = 1
    `
      )
      .run(billMode)
  }

  /**
   * Get current sale mode
   */
  getSaleMode(): number {
    const row = this.db.prepare(`SELECT sale_mode FROM ${this.tableName} LIMIT 1`).get() as
      | { sale_mode: number }
      | undefined
    return row?.sale_mode ?? 0
  }

  /**
   * Get current bill mode
   */
  getBillMode(): number {
    const row = this.db.prepare(`SELECT bill_mode FROM ${this.tableName} LIMIT 1`).get() as
      | { bill_mode: number }
      | undefined
    return row?.bill_mode ?? 0
  }
}

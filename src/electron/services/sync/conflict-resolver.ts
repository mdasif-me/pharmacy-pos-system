// conflict resolver - handle sync conflicts

import { ProductEntity } from '../../types/entities/product.types'

export type ConflictStrategy = 'server-wins' | 'client-wins' | 'latest-wins' | 'manual'

export interface ConflictResolution<T> {
  resolved: T
  strategy: ConflictStrategy
  conflicts: string[]
}

export class ConflictResolver {
  /**
   * resolve product conflict
   */
  resolveProduct(
    local: ProductEntity,
    remote: ProductEntity,
    strategy: ConflictStrategy = 'latest-wins'
  ): ConflictResolution<ProductEntity> {
    const conflicts: string[] = []
    let resolved: ProductEntity

    switch (strategy) {
      case 'server-wins':
        resolved = remote
        break

      case 'client-wins':
        resolved = local
        break

      case 'latest-wins':
        resolved = this.resolveByTimestamp(local, remote, conflicts)
        break

      case 'manual':
        // for manual, return both and let user decide
        // for now, use latest-wins
        resolved = this.resolveByTimestamp(local, remote, conflicts)
        break

      default:
        resolved = remote
    }

    return { resolved, strategy, conflicts }
  }

  /**
   * resolve by comparing versions
   */
  private resolveByVersion(
    local: ProductEntity,
    remote: ProductEntity,
    conflicts: string[]
  ): ProductEntity {
    if (remote.version > local.version) {
      return remote
    } else if (local.version > remote.version) {
      return local
    } else {
      // same version, use timestamp
      return this.resolveByTimestamp(local, remote, conflicts)
    }
  }

  /**
   * resolve by comparing timestamps
   */
  private resolveByTimestamp(
    local: ProductEntity,
    remote: ProductEntity,
    conflicts: string[]
  ): ProductEntity {
    const localTime = new Date(local.last_modified_at || 0).getTime()
    const remoteTime = new Date(remote.last_modified_at || 0).getTime()

    if (remoteTime > localTime) {
      conflicts.push('remote is newer')
      return remote
    } else {
      conflicts.push('local is newer')
      return local
    }
  }

  /**
   * merge non-conflicting fields
   */
  mergeFields(local: ProductEntity, remote: ProductEntity): ProductEntity {
    // take non-null values from both
    return {
      ...remote,
      ...Object.fromEntries(
        Object.entries(local).filter(([_, value]) => value !== null && value !== undefined)
      ),
    } as ProductEntity
  }

  /**
   * detect conflicts between two entities
   */
  detectConflicts(local: ProductEntity, remote: ProductEntity): string[] {
    const conflicts: string[] = []
    const fields: (keyof ProductEntity)[] = ['product_name', 'mrp', 'in_stock', 'status']

    for (const field of fields) {
      if (local[field] !== remote[field]) {
        conflicts.push(`${String(field)}: local=${local[field]}, remote=${remote[field]}`)
      }
    }

    return conflicts
  }
}

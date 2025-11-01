export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  CONFLICT = 'conflict',
}

export enum SyncAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

// alias for backward compatibility
export type SyncQueueAction = SyncAction

export enum QueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface SyncQueueEntity {
  id: number
  entity_type: string
  entity_id: number
  action: SyncAction
  payload: string // JSON
  status: QueueStatus
  retry_count: number
  created_at: string
  synced_at?: string
  error_message?: string
}

export interface SyncMetadataEntity {
  id: number
  entity_type: string
  last_sync_at?: string
  last_sync_version: number
  total_synced: number
  failed_count: number
}

export interface SyncResult {
  status: SyncStatus
  synced_count: number
  failed_count: number
  conflicts: number
  duration_ms: number
  errors?: string[]
}

export interface SyncQueueItem {
  entity_type: string
  entity_id: number
  action: SyncAction
  payload: Record<string, unknown>
}

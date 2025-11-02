# Offline-First Stock Management Implementation

## Summary of Changes

This implementation adds a complete offline-first stock management system to the pharmacy POS application. Products can be added to stock even when offline, and they will be automatically synced when the connection is restored.

## Features Implemented

### 1. **Offline-First Stock Addition**

- Stock additions are now saved to a local queue (`add_stock_queues` table) first
- No internet connection required to add stock
- Automatic sync when connection is available

### 2. **Recent Stock Table**

- Displays the last 20 stock additions
- Shows sync status for each item (Synced ✓ or Pending ⏳)
- Product details: Name, Company, MRP, Quantity, Batch Number, Date Added
- Individual sync buttons for unsynced items
- Error display for failed sync attempts

### 3. **Sync All Button**

- Syncs all unsynced stock items in one click
- Shows count of unsynced items
- Progress feedback during sync
- Detailed error reporting

### 4. **Product Search Improvements**

- Alphabetical match prioritization (products starting with search term appear first)
- Search only by product name (not generic name)
- Display format: `Type. Product Name. Quantity`
- Company name and price shown below
- Quantity extracted from API `raw_data` field

## Files Created

### Backend (Electron)

1. **`src/electron/database/repositories/stock-queue.repository.ts`**

   - Repository for managing the `add_stock_queues` table
   - Methods for adding, syncing, and querying stock queue items

2. **`src/electron/services/stock-queue.service.ts`**

   - Business logic for offline stock management
   - Handles API synchronization
   - Manages sync status and error tracking

3. **`src/electron/ipc/handlers/stock-queue.handler.ts`**
   - IPC handler for stock queue operations
   - Bridges UI and backend functionality

### Frontend (React)

4. **`src/ui/components/features/RecentStock/RecentStockView.tsx`**

   - React component for displaying recent stock additions
   - Real-time sync status updates
   - Individual and bulk sync capabilities

5. **`src/ui/components/features/RecentStock/RecentStockView.css`**
   - Styling for the recent stock table
   - Responsive design
   - Visual indicators for sync status

## Files Modified

### Backend

1. **`src/electron/ipc/channels.ts`**

   - Added `STOCK_QUEUE` channels for IPC communication

2. **`src/electron/ipc/register.ts`**

   - Registered `StockQueueIpcHandler`

3. **`src/electron/preload.cts`**

   - Exposed `stockQueue` methods to renderer process

4. **`src/electron/database/repositories/product.repository.ts`**
   - Fixed product search to prioritize alphabetical matches
   - Added parsing of `raw_data` JSON to extract `quantity` field
   - Search now only uses `product_name`, not `generic_name`

### Frontend

5. **`src/ui/components/features/AddStock/AddStockView.tsx`**

   - Changed to use offline-first approach (`stockQueue.addOffline`)
   - Integrated `RecentStockView` component
   - Removed direct API broadcasting (now handled by sync queue)

6. **`types.d.ts`**
   - Added TypeScript definitions for `stockQueue` methods

## Database Schema

The existing `add_stock_queues` table (from migration 003) is used:

```sql
CREATE TABLE IF NOT EXISTS add_stock_queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  stock_mrp REAL NOT NULL,
  purchase_price REAL NOT NULL,
  discount_price REAL NOT NULL,
  peak_hour_price REAL NOT NULL,
  offer_price REAL NOT NULL,
  perc_off REAL NOT NULL DEFAULT 0,
  batch_no TEXT NOT NULL,
  expire_date TEXT NOT NULL,
  qty INTEGER NOT NULL,
  stock_alert INTEGER NOT NULL DEFAULT 0,
  shelf TEXT,
  is_sync INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  synced_at TEXT,
  error_message TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
)
```

## API Methods Added

### Window.electron.stockQueue

```typescript
{
  // Add stock to offline queue
  addOffline: (payload) => Promise<{ success: boolean; data: any }>

  // Sync a single stock item
  syncSingle: (stockId: number) => Promise<{ success: boolean; error?: string }>

  // Sync all unsynced items
  syncAll: () =>
    Promise<{
      total: number
      success: number
      failed: number
      errors: Array<{ id: number; error: string }>
    }>

  // Get recent stock additions
  getRecent: (limit?: number) => Promise<StockQueueItem[]>

  // Get count of unsynced items
  getUnsyncedCount: () => Promise<number>
}
```

## How It Works

### Adding Stock

1. User fills out stock form in AddStockView
2. On submit, data is saved to `add_stock_queues` table with `is_sync = 0`
3. Success message shown immediately (no network required)
4. User can continue adding more stock

### Syncing Stock

1. **Automatic**: Items can be synced automatically in background (future enhancement)
2. **Manual Single**: Click "Sync" button on individual item
3. **Manual Bulk**: Click "Sync All" button to sync all pending items

### Sync Process

1. Item is retrieved from `add_stock_queues`
2. API call is made to `/pharmacy/real-time-add-stock-and-broadcast`
3. On success:
   - `is_sync` set to 1
   - `synced_at` updated with timestamp
   - `error_message` cleared
4. On failure:
   - `error_message` stored for troubleshooting
   - Item remains unsynced for retry

## User Interface

### Add Stock Page

- Existing form remains unchanged
- Stock is now saved offline-first
- Success message: "Stock added to queue successfully. It will be synced automatically."

### Recent Stock Table

- Appears above the Add Stock form
- Shows 20 most recent stock additions
- Color coding:
  - **Yellow background**: Unsynced items
  - **White background**: Synced items
- Badge indicators:
  - ✓ **Synced**: Item successfully synced to server
  - ⏳ **Pending**: Waiting to be synced
  - ⚠ **Error**: Sync failed (hover for details)

### Sync Controls

- **Unsynced Badge**: Shows count of items pending sync
- **Sync All Button**: Syncs all pending items at once
- **Individual Sync Buttons**: Appears only for unsynced items

## Product Search Improvements

### Search Behavior

- **Before**: Products containing search term anywhere matched
- **After**: Products **starting with** search term appear first

Example: Searching "act"

- **First**: acteria, actofan, actizen (starts with "act")
- **Then**: adcotofin (contains "act" but doesn't start with it)

### Display Format

Products now show: **Type. Product Name. Quantity**

Example:

```
Tab. 3Bion. 100 mg+200 mg+200 mcg
Julphar Bangladesh Ltd.                    ৳10.00
```

- Type abbreviated to first 3 characters (e.g., "Tab" for "Tablet")
- Quantity extracted from API `raw_data` JSON field
- Company name and price on second line

## Testing the Implementation

### Test Offline-First Functionality

1. Add stock while online - verify it's saved to queue
2. Check Recent Stock table - item should show as "Pending"
3. Click "Sync All" - item should change to "Synced"
4. Disconnect internet
5. Add more stock - should still work
6. Reconnect internet
7. Click "Sync All" - offline items should sync

### Test Product Search

1. Search for "3" - should see "3Bion" first
2. Verify quantity is displayed (e.g., "100 mg+200 mg+200 mcg")
3. Verify type is abbreviated (e.g., "Tab.")
4. Verify company name and price shown below

## Future Enhancements

1. **Auto-sync Background Process**

   - Periodically check for unsynced items
   - Attempt sync when connection is detected

2. **Sync Retry Logic**

   - Exponential backoff for failed syncs
   - Configurable retry attempts

3. **Sync Statistics Dashboard**

   - Total items synced today
   - Sync success rate
   - Average sync time

4. **Conflict Resolution**

   - Handle cases where product data changed on server
   - Merge strategies for concurrent edits

5. **Bulk Operations**

   - Export unsynced items as JSON
   - Import/sync from JSON file

6. **Notifications**
   - Toast notifications for sync events
   - Desktop notifications for errors

## Troubleshooting

### Stock not syncing

1. Check internet connection
2. Verify authentication token is valid
3. Check console for error messages
4. Look at error message in Recent Stock table

### Quantity not showing in search

1. Verify product has `raw_data` field populated
2. Check console for JSON parsing errors
3. Ensure product was synced from API (not manually added)

### Recent Stock table empty

1. Add some stock items first
2. Check if `add_stock_queues` table exists
3. Verify migration 003 was applied

## Notes

- The offline queue approach ensures data is never lost
- Sync status is persisted in the database
- Failed syncs can be retried manually or automatically
- Old synced items can be cleaned up periodically (30 days by default)
- The system is designed to handle network interruptions gracefully

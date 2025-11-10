# Add Stock and Broadcast with Batches and Sales Implementation

This document describes the implementation of stock addition with real-time broadcast and the new batches/sales management system.

## Overview

The implementation includes:

1. **Stock Addition with Real-time Broadcast**: Add stock with automatic API sync and broadcast to all clients
2. **Batches Table**: Track product stock batches with expiration and status
3. **Sales Table**: Record customer sales/orders
4. **Sale Items Table**: Track individual items in a sale with multi-batch allocation support

## Database Schema

### Batches Table

```sql
CREATE TABLE batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_stock_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  batch_no TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 0,
  qty_stock INTEGER NOT NULL DEFAULT 0,
  exp DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Boxed',
  sync_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(batch_no, product_id)
)
```

**Batch Status**:

- `Boxed`: Initial state (still sealed)
- `Open`: Newly opened & running to sale
- `Used`: Sold items from box
- `expire`: Marked as expired (14+ days)

### Sales Table

```sql
CREATE TABLE sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_phone_number TEXT,
  grand_total REAL NOT NULL,
  grand_discount_total REAL NOT NULL,
  is_sync INTEGER NOT NULL DEFAULT 0,
  mediboy_customer_id INTEGER,
  sale_date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  synced_at TEXT,
  error_message TEXT
)
```

### Sale Items Table

```sql
CREATE TABLE sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_id INTEGER NOT NULL,
  product_stock_id INTEGER,
  product_id INTEGER NOT NULL,
  mrp REAL NOT NULL,
  sale_price REAL NOT NULL,
  qty INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
)
```

## API Integration

### Add Stock and Broadcast Endpoint

**Endpoint**: `POST https://beta-api.mediboy.org/api/pharmacy/real-time-add-stock-and-broadcast`

**Payload**:

```json
{
  "product_id": 123,
  "stock_mrp": 100.0,
  "purchase_price": 50.0,
  "discount_price": 90.0,
  "peak_hour_price": 95.0,
  "offer_price": 85.0,
  "perc_off": 10.0,
  "batch_no": "BATCH001",
  "expire_date": "2025/12/31",
  "qty": 100,
  "stock_alert": 10,
  "shelf": "A-1"
}
```

## Services

### StockQueueService

Handles offline-first stock addition with automatic API sync.

**Key Methods**:

- `addStockOffline(payload)`: Add stock to queue for offline use
- `addStockSynced(payload)`: Add stock that's already synced
- `syncStockItem(stockId)`: Sync single stock item to API
- `syncAllUnsynced()`: Sync all pending stock items
- `broadcastStockToAPI(stock)`: Internal method for API broadcast

**Features**:

- Offline-first approach
- Automatic retry on network availability
- API error handling and logging

### SalesService

Handles sales creation with intelligent multi-batch allocation.

**Key Methods**:

- `createSale(payload)`: Create a complete sale with items
- `getSaleWithItems(saleId)`: Retrieve sale with all items
- `getUnsyncedSales()`: Get unsynced sales
- `markSaleAsSynced(saleId)`: Mark sale as synced
- `getSalesByDateRange(from, to)`: Get sales by date
- `getSalesStats()`: Get sales statistics

**Multi-batch Allocation Algorithm**:
When a sale is created for a product sold from multiple batches:

1. Gets all available batches for the product ordered by expiration
2. Allocates from available quantity in each batch sequentially
3. Creates separate sale_items records for each batch
4. Reduces available quantity from each batch as items are allocated
5. Handles shortage by creating item without batch reference if needed

**Example**:

```
Product: Aspirin 500mg
Sale Qty: 40

Available Batches:
- Batch 1: 10 available, expires 2025-06-15
- Batch 2: 100 available, expires 2025-12-31

Result:
- sale_items record 1: {product_stock_id: 1, qty: 10, ...}
- sale_items record 2: {product_stock_id: 2, qty: 30, ...}
- Both batches' available quantities reduced accordingly
```

### BatchesRepository

CRUD operations for batches.

**Key Methods**:

- `create()`: Create new batch
- `update()`: Update batch
- `getByProductId()`: Get all batches for a product
- `getAvailableBatches()`: Get batches with available qty > 0
- `getExpiringBefore()`: Get batches expiring before date
- `reduceAvailable()`: Reduce available qty (used during sales)
- `getByStatus()`: Get batches by status
- `search()`: Advanced search with filters

### SalesRepository

CRUD operations for sales.

**Key Methods**:

- `create()`: Create sale
- `getUnsynced()`: Get unsynced sales
- `markAsSynced()`: Mark as synced
- `getSalesByDateRange()`: Range query
- `getSalesStats()`: Aggregate statistics
- `search()`: Advanced search

### SaleItemsRepository

CRUD operations for sale items.

**Key Methods**:

- `create()`: Create sale item
- `getBySaleId()`: Get items for a sale
- `getBySaleIdWithProduct()`: Get items with product details
- `getByProductId()`: Get items for a product
- `getByBatchId()`: Get items from a batch
- `getTotalQtySoldByProduct()`: Get total qty sold for product

## IPC Channels

### Stock Queue Channels

```typescript
STOCK_QUEUE: {
  ADD_OFFLINE: 'stock-queue:addOffline',
  SYNC_SINGLE: 'stock-queue:syncSingle',
  SYNC_ALL: 'stock-queue:syncAll',
  GET_RECENT: 'stock-queue:getRecent',
  GET_UNSYNCED_COUNT: 'stock-queue:getUnsyncedCount',
  GET_UNSYNCED_AND_TODAY: 'stock-queue:getUnsyncedAndToday',
}
```

### Sales Channels

```typescript
SALES: {
  CREATE: 'sales:create',
  GET: 'sales:get',
  GET_BY_CUSTOMER: 'sales:getByCustomer',
  GET_BY_DATE_RANGE: 'sales:getByDateRange',
  GET_ALL: 'sales:getAll',
  GET_UNSYNCED: 'sales:getUnsynced',
  GET_UNSYNCED_COUNT: 'sales:getUnsyncedCount',
  MARK_SYNCED: 'sales:markSynced',
  GET_STATS: 'sales:getStats',
  DELETE: 'sales:delete',
}
```

### Batches Channels

```typescript
BATCHES: {
  GET_BY_PRODUCT: 'batches:getByProduct',
  GET_AVAILABLE: 'batches:getAvailable',
  GET_BY_STATUS: 'batches:getByStatus',
  GET_EXPIRING: 'batches:getExpiring',
  GET_ALL: 'batches:getAll',
  UPDATE_STATUS: 'batches:updateStatus',
}
```

### Sale Items Channels

```typescript
SALE_ITEMS: {
  GET_BY_SALE: 'sale-items:getBySale',
  GET_BY_SALE_WITH_PRODUCT: 'sale-items:getBySaleWithProduct',
}
```

## Usage Examples

### Adding Stock

```typescript
// From React/UI
const result = await window.electronAPI.invoke('stock-queue:addOffline', {
  product_id: 123,
  stock_mrp: 100,
  purchase_price: 50,
  discount_price: 90,
  peak_hour_price: 95,
  offer_price: 85,
  perc_off: 10,
  batch_no: 'BATCH001',
  expire_date: '2025-12-31',
  qty: 100,
  stock_alert: 10,
  shelf: 'A-1',
})
```

### Creating a Sale

```typescript
// From React/UI
const result = await window.electronAPI.invoke('sales:create', {
  customer_phone_number: '123-456-7890',
  sale_items: [
    {
      product_id: 1,
      qty: 5,
      mrp: 100,
      sale_price: 95,
    },
    {
      product_id: 2,
      qty: 3,
      mrp: 50,
      sale_price: 45,
    },
  ],
  grand_total: 635,
  grand_discount_total: 25,
})
```

### Getting Available Batches

```typescript
// From React/UI
const batches = await window.electronAPI.invoke('batches:getAvailable', 123)
```

### Getting Sales Statistics

```typescript
// From React/UI
const stats = await window.electronAPI.invoke('sales:getStats', {
  fromDate: '2025-01-01',
  toDate: '2025-12-31',
})
```

## Migration Files

The following migration files have been added:

1. **005_create_batches_table.ts**: Creates batches table with indexes
2. **006_create_sales_table.ts**: Creates sales table with indexes
3. **007_create_sale_items_table.ts**: Creates sale_items table with indexes

All migrations are registered in `migration.registry.ts` and will be applied automatically on app startup.

## Type Definitions

### Batch Types

- `BatchEntity`: Complete batch record
- `BatchCreateDTO`: Data for creating batch
- `BatchUpdateDTO`: Data for updating batch
- `BatchSearchParams`: Query parameters for batch search
- `BatchStatus`: Enum for batch statuses

### Sale Types

- `SaleEntity`: Complete sale record
- `SaleCreateDTO`: Data for creating sale
- `SaleUpdateDTO`: Data for updating sale
- `SaleSearchParams`: Query parameters for sale search

### Sale Item Types

- `SaleItemEntity`: Complete sale item record
- `SaleItemCreateDTO`: Data for creating sale item
- `SaleItemUpdateDTO`: Data for updating sale item
- `SaleItemSearchParams`: Query parameters for sale item search
- `SaleItemWithProduct`: Sale item with product details

## Error Handling

All services include comprehensive error handling:

- Database constraint violations
- Missing references
- Network errors for API calls
- Authentication errors

Errors are logged with context and thrown with descriptive messages for UI handling.

## Sync Strategy

### Stock Addition

1. Stock added offline-first to `add_stock_queues` table
2. Local product stock updated immediately
3. When network available, API call made
4. On success, marked as synced in queue
5. On failure, error stored for retry

### Sales

1. Sales created locally (is_sync = 0)
2. All sale items created with batch allocation
3. When network available, sales synced to API
4. Batch availability automatically managed through sales items

## Performance Considerations

1. **Indexes**: Created on frequently queried columns (product_id, batch_no, sync status, dates)
2. **Transactions**: Database transactions used for multi-step operations (especially sales creation)
3. **Batch Queries**: Optimized queries for batch allocation to minimize database roundtrips
4. **Pagination**: All listing operations support pagination

## Future Enhancements

1. Real-time socket notifications for stock updates to all clients
2. Automatic batch expiration handling
3. Low stock alerts
4. Batch cost tracking and profitability analysis
5. Sales return/refund handling
6. Customer credit/loyalty tracking

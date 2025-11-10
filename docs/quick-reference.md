# Quick Reference Card

## Add Stock Flow

```
User clicks "Add Stock"
    ↓
UI sends payload via IPC: 'stock-queue:addOffline'
    ↓
StockQueueService.addStockOffline()
    ↓
Entry added to add_stock_queues table (is_sync = 0)
    ↓
Product stock updated locally in products table
    ↓
When network available:
StockQueueService.broadcastStockToAPI()
    ↓
API call to: /api/pharmacy/real-time-add-stock-and-broadcast
    ↓
On success: is_sync = 1, synced_at = NOW()
On failure: error_message stored for retry
```

## Create Sale Flow

```
User submits sale form with items
    ↓
UI sends payload via IPC: 'sales:create'
    ↓
SalesService.createSale()
    ↓
Create sales record (is_sync = 0)
    ↓
For each sale item:
  - Get available batches for product
  - Allocate qty from batches sequentially
  - Create sale_items record(s)
  - Reduce batch.available
    ↓
Return sale with items
    ↓
Display to user / Print receipt
```

## Multi-Batch Allocation Example

```
Product: Aspirin 500mg, Qty requested: 40

Available Batches:
┌─────────────────────────────┬──────────┬────────┐
│ Batch Number                │ Available│ Expires│
├─────────────────────────────┼──────────┼────────┤
│ BATCH-2025-001              │ 10       │ 2025-06-15
│ BATCH-2025-002              │ 100      │ 2025-12-31
└─────────────────────────────┴──────────┴────────┘

Allocation Result:
┌──────────────┬───────────────┬──────┐
│ Batch        │ Qty Allocated │ From │
├──────────────┼───────────────┼──────┤
│ BATCH-001    │ 10            │ All available
│ BATCH-002    │ 30            │ First 30 of 100
└──────────────┴───────────────┴──────┘

Sale Items Created: 2 records
- sale_items[1]: product_stock_id=1, qty=10
- sale_items[2]: product_stock_id=2, qty=30

Batches Updated:
- BATCH-001: available = 0
- BATCH-002: available = 70
```

## Common IPC Calls

### Add Stock

```javascript
await ipcRenderer.invoke('stock-queue:addOffline', {
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

### Create Sale

```javascript
await ipcRenderer.invoke('sales:create', {
  customer_phone_number: '123-456-7890',
  sale_items: [{ product_id: 1, qty: 5, mrp: 100, sale_price: 95 }],
  grand_total: 475,
  grand_discount_total: 25,
})
```

### Get Available Batches

```javascript
await ipcRenderer.invoke('batches:getAvailable', 123)
```

### Get Sale Stats

```javascript
await ipcRenderer.invoke('sales:getStats', {
  fromDate: '2025-01-01',
  toDate: '2025-12-31',
})
```

### Sync All Stock

```javascript
await ipcRenderer.invoke('stock-queue:syncAll')
```

### Get Unsynced Count

```javascript
const stock = await ipcRenderer.invoke('stock-queue:getUnsyncedCount')
const sales = await ipcRenderer.invoke('sales:getUnsyncedCount')
```

## Database Query Reference

### Get all batches for a product

```sql
SELECT * FROM batches
WHERE product_id = ?
ORDER BY exp ASC
```

### Get sales by date range

```sql
SELECT * FROM sales
WHERE sale_date BETWEEN ? AND ?
ORDER BY created_at DESC
```

### Get sale items with product details

```sql
SELECT si.*, p.product_name, b.batch_no
FROM sale_items si
LEFT JOIN products p ON si.product_id = p.id
LEFT JOIN batches b ON si.product_stock_id = b.id
WHERE si.sales_id = ?
```

### Get sales statistics

```sql
SELECT
  COUNT(*) as total_sales,
  SUM(grand_total) as total_amount,
  SUM(grand_discount_total) as total_discount,
  SUM(CASE WHEN is_sync = 1 THEN 1 ELSE 0 END) as synced_count
FROM sales
WHERE sale_date BETWEEN ? AND ?
```

## Batch Status Transitions

```
Boxed (newly received, sealed box)
  ↓
Open (box opened, in active sale)
  ↓
Used (all qty sold from this batch)

OR

Expire (expired after 14+ days)
```

## Error Response Pattern

```javascript
{
  success: false,
  error: "Error message describing what went wrong"
}
```

## Success Response Pattern

```javascript
{
  success: true,
  data: {
    // Response data
  }
}
```

## Sync Status

- `is_sync = 0`: Not yet synced
- `is_sync = 1`: Successfully synced
- `error_message`: Set when sync fails (is_sync remains 0)
- `synced_at`: Timestamp when successfully synced

## Performance Tips

1. **Use pagination**: `limit: 100, offset: 0` for large queries
2. **Batch your requests**: Combine multiple queries when possible
3. **Cache products**: Fetch once and reuse in memory
4. **Debounce searches**: Delay search queries to reduce DB hits
5. **Use indexes**: Queries filter on indexed columns (product_id, dates, sync status)

## Debugging

### Check sync queue

```sql
SELECT * FROM add_stock_queues
WHERE is_sync = 0
ORDER BY created_at ASC
```

### Check sales sync status

```sql
SELECT * FROM sales
WHERE is_sync = 0
ORDER BY created_at ASC
```

### Check batch availability

```sql
SELECT batch_no, available, qty_stock, exp, status
FROM batches
WHERE product_id = ?
ORDER BY exp ASC
```

### Check sale items

```sql
SELECT si.*, p.product_name, b.batch_no
FROM sale_items si
LEFT JOIN products p ON si.product_id = p.id
LEFT JOIN batches b ON si.product_stock_id = b.id
WHERE si.sales_id = ?
```

## Important Notes

1. **Date Format**:

   - Expire date input: YYYY-MM-DD
   - API expects: YYYY/MM/DD (auto-converted)

2. **Transactions**: Multi-step operations (sales creation) use DB transactions

3. **Offline-first**: All stock/sales created locally first, synced when online

4. **Batch Allocation**: Always done by expiration date (FIFO for expiry)

5. **Sync Status**: Only changes to 1 after successful API call

6. **Foreign Keys**: CASCADE delete on product/sale deletion

7. **Unique Constraint**: batch_no + product_id must be unique per pharmacy

## File Locations

```
Core Implementation:
- Migrations: src/electron/database/migrations/00x_*.ts
- Repositories: src/electron/database/repositories/*.repository.ts
- Services: src/electron/services/*.service.ts
- Types: src/electron/types/entities/*.types.ts
- IPC Handlers: src/electron/ipc/handlers/*.handler.ts

Documentation:
- Technical: docs/add-stock-and-sales-implementation.md
- Frontend: docs/frontend-implementation-guide.md
- Summary: IMPLEMENTATION_SUMMARY.md
- This file: docs/quick-reference.md
```

---

**Last Updated**: November 10, 2025
**Status**: Ready for Integration

# Frontend Implementation Guide

## Quick Start for UI Integration

This guide shows how to integrate the new stock addition and sales features in the React frontend.

## 1. Add Stock with Broadcast

### Add Stock Button Handler

```typescript
// In your component
import { CreatePayloadType } from 'electron-preload/ipc'

const handleAddStock = async (formData: AddStockFormData) => {
  try {
    // Show loading state
    setLoading(true)

    const payload = {
      product_id: formData.productId,
      stock_mrp: formData.mrp,
      purchase_price: formData.purchasePrice,
      discount_price: formData.discountPrice,
      peak_hour_price: formData.peakHourPrice,
      offer_price: formData.offerPrice,
      perc_off: formData.percOff,
      batch_no: formData.batchNo,
      expire_date: formData.expireDate, // YYYY-MM-DD format
      qty: formData.qty,
      stock_alert: formData.stockAlert || 0,
      shelf: formData.shelf || null,
    }

    // Send to Electron IPC
    const result = await window.electronAPI.invoke('stock-queue:addOffline', payload)

    if (result.success) {
      // Show success notification
      showNotification('Stock added successfully', 'success')

      // Clear form
      resetForm()

      // Refresh product list or update UI
      refreshProducts()
    }
  } catch (error) {
    console.error('Failed to add stock:', error)
    showNotification(`Failed to add stock: ${error.message}`, 'error')
  } finally {
    setLoading(false)
  }
}
```

### Add Stock Form Component

```typescript
import React, { useState } from 'react'
import { Button, Input, DatePicker, Select, Form, message } from 'antd'

interface AddStockFormData {
  productId: number
  mrp: number
  purchasePrice: number
  discountPrice: number
  peakHourPrice: number
  offerPrice: number
  percOff: number
  batchNo: string
  expireDate: string
  qty: number
  stockAlert?: number
  shelf?: string
}

export function AddStockForm() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: AddStockFormData) => {
    try {
      setLoading(true)

      // Format date to YYYY-MM-DD if it's a moment object
      const expireDate =
        typeof values.expireDate === 'string'
          ? values.expireDate
          : values.expireDate.format('YYYY-MM-DD')

      const payload = {
        ...values,
        expireDate,
      }

      const result = await window.electronAPI.invoke('stock-queue:addOffline', payload)

      if (result.success) {
        message.success('Stock added successfully')
        form.resetFields()
      }
    } catch (error: any) {
      message.error(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item name="productId" label="Product" rules={[{ required: true }]}>
        <Select placeholder="Select product" />
      </Form.Item>

      <Form.Item name="batchNo" label="Batch Number" rules={[{ required: true }]}>
        <Input placeholder="e.g., BATCH001" />
      </Form.Item>

      <Form.Item name="qty" label="Quantity" rules={[{ required: true }]}>
        <Input type="number" min={1} />
      </Form.Item>

      <Form.Item name="mrp" label="MRP" rules={[{ required: true }]}>
        <Input type="number" step={0.01} />
      </Form.Item>

      <Form.Item name="purchasePrice" label="Purchase Price" rules={[{ required: true }]}>
        <Input type="number" step={0.01} />
      </Form.Item>

      <Form.Item name="discountPrice" label="Discount Price">
        <Input type="number" step={0.01} />
      </Form.Item>

      <Form.Item name="peakHourPrice" label="Peak Hour Price">
        <Input type="number" step={0.01} />
      </Form.Item>

      <Form.Item name="offerPrice" label="Offer Price">
        <Input type="number" step={0.01} />
      </Form.Item>

      <Form.Item name="percOff" label="Discount %" rules={[{ required: true }]}>
        <Input type="number" step={0.01} />
      </Form.Item>

      <Form.Item name="expireDate" label="Expiry Date" rules={[{ required: true }]}>
        <DatePicker format="YYYY-MM-DD" />
      </Form.Item>

      <Form.Item name="shelf" label="Shelf (Optional)">
        <Input placeholder="e.g., A-1, B-2" />
      </Form.Item>

      <Form.Item name="stockAlert" label="Stock Alert Level" initialValue={10}>
        <Input type="number" min={0} />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={loading}>
        Add Stock
      </Button>
    </Form>
  )
}
```

## 2. Create a Sale

### Create Sale Handler

```typescript
const handleCreateSale = async (saleData: SaleData) => {
  try {
    setLoading(true)

    const payload = {
      customer_phone_number: saleData.customerPhone,
      sale_items: saleData.items.map((item) => ({
        product_id: item.productId,
        qty: item.qty,
        mrp: item.mrp,
        sale_price: item.salePrice,
      })),
      grand_total: saleData.grandTotal,
      grand_discount_total: saleData.grandDiscountTotal,
      mediboy_customer_id: saleData.customerId,
    }

    const result = await window.electronAPI.invoke('sales:create', payload)

    if (result.success) {
      showNotification('Sale created successfully', 'success')
      // Handle post-creation logic (receipt printing, etc.)
      handleSaleCreated(result.data)
    }
  } catch (error) {
    console.error('Failed to create sale:', error)
    showNotification(`Failed to create sale: ${error.message}`, 'error')
  } finally {
    setLoading(false)
  }
}
```

### Sale Form Component

```typescript
import React, { useState } from 'react'
import { Form, Input, Table, Button, InputNumber, Popconfirm, message } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

interface SaleItem {
  key: string
  productId: number
  productName: string
  qty: number
  mrp: number
  salePrice: number
}

export function CreateSaleForm() {
  const [form] = Form.useForm()
  const [items, setItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(false)

  const handleAddItem = (productId: number, productName: string, mrp: number) => {
    const newItem: SaleItem = {
      key: Date.now().toString(),
      productId,
      productName,
      qty: 1,
      mrp,
      salePrice: mrp,
    }
    setItems([...items, newItem])
  }

  const handleRemoveItem = (key: string) => {
    setItems(items.filter((item) => item.key !== key))
  }

  const calculateTotals = () => {
    const total = items.reduce((sum, item) => sum + item.salePrice * item.qty, 0)
    const originalTotal = items.reduce((sum, item) => sum + item.mrp * item.qty, 0)
    const discount = originalTotal - total
    return { total, discount, originalTotal }
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      message.error('Please add items to the sale')
      return
    }

    const { total, discount } = calculateTotals()
    const customerPhone = form.getFieldValue('customerPhone')

    try {
      setLoading(true)

      const payload = {
        customer_phone_number: customerPhone,
        sale_items: items.map((item) => ({
          product_id: item.productId,
          qty: item.qty,
          mrp: item.mrp,
          sale_price: item.salePrice,
        })),
        grand_total: total,
        grand_discount_total: discount,
      }

      const result = await window.electronAPI.invoke('sales:create', payload)

      if (result.success) {
        message.success(`Sale #${result.data.id} created successfully`)
        form.resetFields()
        setItems([])
      }
    } catch (error: any) {
      message.error(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: 'Product', dataIndex: 'productName', key: 'productName' },
    {
      title: 'Qty',
      dataIndex: 'qty',
      key: 'qty',
      render: (qty: number, record: SaleItem, idx: number) => (
        <InputNumber
          min={1}
          value={qty}
          onChange={(value) => {
            const newItems = [...items]
            newItems[idx].qty = value || 1
            setItems(newItems)
          }}
        />
      ),
    },
    { title: 'MRP', dataIndex: 'mrp', key: 'mrp' },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      key: 'salePrice',
      render: (price: number, record: SaleItem, idx: number) => (
        <InputNumber
          step={0.01}
          value={price}
          onChange={(value) => {
            const newItems = [...items]
            newItems[idx].salePrice = value || 0
            setItems(newItems)
          }}
        />
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (_, record: SaleItem) => (record.salePrice * record.qty).toFixed(2),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record: SaleItem) => (
        <Popconfirm title="Remove item?" onConfirm={() => handleRemoveItem(record.key)}>
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const { total, discount } = calculateTotals()

  return (
    <div>
      <Form form={form} layout="vertical">
        <Form.Item name="customerPhone" label="Customer Phone (Optional)">
          <Input placeholder="123-456-7890" />
        </Form.Item>
      </Form>

      <Table columns={columns} dataSource={items} pagination={false} size="small" />

      <div style={{ marginTop: 20 }}>
        <p>
          <strong>Grand Total: ₹{total.toFixed(2)}</strong>
        </p>
        <p>
          <strong>Discount: ₹{discount.toFixed(2)}</strong>
        </p>
      </div>

      <Button type="primary" onClick={handleSubmit} loading={loading} style={{ marginTop: 20 }}>
        Create Sale
      </Button>
    </div>
  )
}
```

## 3. View Batches

```typescript
const getBatches = async (productId: number) => {
  try {
    const result = await window.electronAPI.invoke('batches:getAvailable', productId)

    if (result.success) {
      // Use result.data - array of available batches
      setBatches(result.data)
    }
  } catch (error) {
    console.error('Failed to get batches:', error)
  }
}
```

## 4. View Sales

```typescript
const getSalesStats = async () => {
  try {
    const result = await window.electronAPI.invoke('sales:getStats', {
      fromDate: '2025-01-01',
      toDate: '2025-12-31',
    })

    if (result.success) {
      const stats = result.data
      console.log('Total Sales:', stats.total_sales)
      console.log('Total Amount:', stats.total_amount)
      console.log('Total Discount:', stats.total_discount)
      console.log('Synced Count:', stats.synced_count)
    }
  } catch (error) {
    console.error('Failed to get stats:', error)
  }
}
```

## 5. Sync Unsynced Sales/Stock

```typescript
// Sync all unsynced stock items
const syncAllStock = async () => {
  try {
    const result = await window.electronAPI.invoke('stock-queue:syncAll')

    if (result.success) {
      console.log(`Synced: ${result.data.success}, Failed: ${result.data.failed}`)
      showNotification(`Stock synced successfully`, 'success')
    }
  } catch (error) {
    console.error('Failed to sync stock:', error)
  }
}

// Get unsynced count
const getUnsyncedCounts = async () => {
  try {
    const stockCount = await window.electronAPI.invoke('stock-queue:getUnsyncedCount')
    const salesCount = await window.electronAPI.invoke('sales:getUnsyncedCount')

    console.log('Unsynced Stock:', stockCount.data.count)
    console.log('Unsynced Sales:', salesCount.data.count)
  } catch (error) {
    console.error('Failed to get counts:', error)
  }
}
```

## Error Handling

All IPC calls should follow this pattern:

```typescript
try {
  const result = await window.electronAPI.invoke('channel:name', payload)

  if (result.success) {
    // Handle success with result.data
  } else {
    // Handle error
    console.error('Error:', result.error)
  }
} catch (error) {
  // Handle IPC error
  console.error('IPC Error:', error)
}
```

## Type Definitions for UI

Add these TypeScript types to your UI codebase:

```typescript
// types/stock.ts
export interface AddStockPayload {
  product_id: number
  stock_mrp: number
  purchase_price: number
  discount_price: number
  peak_hour_price: number
  offer_price: number
  perc_off: number
  batch_no: string
  expire_date: string
  qty: number
  stock_alert?: number
  shelf?: string | null
}

// types/sales.ts
export interface CreateSalePayload {
  customer_phone_number?: string
  sale_items: SaleItemPayload[]
  grand_total: number
  grand_discount_total: number
  mediboy_customer_id?: number
}

export interface SaleItemPayload {
  product_id: number
  qty: number
  mrp: number
  sale_price: number
}

// types/batch.ts
export interface BatchEntity {
  id: number
  product_stock_id: number
  product_id: number
  batch_no: string
  available: number
  qty_stock: number
  exp: string
  status: 'Boxed' | 'Open' | 'Used' | 'expire'
  sync_at?: string
  created_at?: string
  updated_at?: string
}
```

## Testing

To test the integration:

1. **Add Stock**: Submit the add stock form and verify it appears in the stock queue
2. **Create Sale**: Create a sale with multiple items and verify batch allocation
3. **View Batches**: Check that batches show available quantities
4. **Check Sync Status**: Monitor sync count before and after network connection

## Performance Tips

1. Paginate large data sets using limit/offset
2. Cache frequently accessed data (products, categories)
3. Debounce search queries
4. Use batch operations where possible
5. Monitor database size and run cleanup jobs for old synced records

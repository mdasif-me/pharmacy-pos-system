import React, { useCallback, useState } from 'react'
import { showError, showSuccess } from '../../../utils/alerts'
import './SalesTable.css'

interface SaleItem {
  id: number
  product_name: string
  qty: number
  mrp: number
  sale_price: number
  total: number
}

interface Sale {
  id: number
  customer_phone_number?: string
  grand_total: number
  grand_discount_total: number
  sale_date: string
  is_sync: number
  mediboy_customer_id?: number
  items?: SaleItem[]
}

interface SalesTableProps {
  sales: Sale[]
  loading: boolean
}

export const SalesTable: React.FC<SalesTableProps> = ({ sales, loading }) => {
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null)
  const [saleDetails, setSaleDetails] = useState<Map<number, SaleItem[]>>(new Map())
  const [syncingSaleId, setSyncingSaleId] = useState<number | null>(null)

  const loadSaleDetails = useCallback(
    async (saleId: number) => {
      if (saleDetails.has(saleId)) {
        return
      }

      try {
        const result = await window.electron.saleItems.getBySaleWithProduct(saleId)
        setSaleDetails((prev) => new Map(prev).set(saleId, result || []))
      } catch (error) {
        console.error('Failed to load sale details:', error)
        showError('Error', 'Failed to load sale details')
      }
    },
    [saleDetails]
  )

  const handleExpandSale = useCallback(
    (saleId: number) => {
      if (expandedSaleId === saleId) {
        setExpandedSaleId(null)
      } else {
        setExpandedSaleId(saleId)
        loadSaleDetails(saleId)
      }
    },
    [expandedSaleId, loadSaleDetails]
  )

  const handleDeleteSale = useCallback(async (saleId: number) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) {
      return
    }

    try {
      await window.electron.sales.delete(saleId)
      showSuccess('Success', 'Sale deleted successfully')
    } catch (error) {
      console.error('Failed to delete sale:', error)
      showError('Error', 'Failed to delete sale')
    }
  }, [])

  const handleSyncSale = useCallback(async (saleId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSyncingSaleId(saleId)

    try {
      await window.electron.sales.syncSingle(saleId)
      showSuccess('Success', 'Sale synced successfully')
    } catch (error: any) {
      console.error('Failed to sync sale:', error)
      const errorMsg = error.response?.data?.message || error.message || 'Failed to sync sale'
      showError('Sync Failed', errorMsg)
    } finally {
      setSyncingSaleId(null)
    }
  }, [])

  if (loading) {
    return <div className="sales-table-container">Loading...</div>
  }

  if (sales.length === 0) {
    return (
      <div className="sales-table-container">
        <p className="no-data">No sales found</p>
      </div>
    )
  }

  return (
    <div className="sales-table-container">
      <table className="sales-table">
        <thead>
          <tr>
            <th>Sale ID</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total</th>
            <th>Discount</th>
            <th>Sync Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <React.Fragment key={sale.id}>
              <tr className={expandedSaleId === sale.id ? 'expanded' : ''}>
                <td>{sale.id}</td>
                <td>{sale.customer_phone_number || 'Walk-in'}</td>
                <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                <td>৳{sale.grand_total.toFixed(2)}</td>
                <td>৳{sale.grand_discount_total.toFixed(2)}</td>
                <td>
                  <span className={`badge ${sale.is_sync ? 'synced' : 'pending'}`}>
                    {sale.is_sync ? 'Synced' : 'Pending'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-small btn-info"
                      onClick={() => handleExpandSale(sale.id)}
                    >
                      {expandedSaleId === sale.id ? 'Hide' : 'View'}
                    </button>
                    {!sale.is_sync && (
                      <button
                        className="btn-small btn-primary"
                        onClick={(e) => handleSyncSale(sale.id, e)}
                        disabled={syncingSaleId === sale.id}
                      >
                        {syncingSaleId === sale.id ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                    <button
                      className="btn-small btn-danger"
                      onClick={() => handleDeleteSale(sale.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              {expandedSaleId === sale.id && (
                <tr className="details-row">
                  <td colSpan={7}>
                    <div className="sale-details">
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>MRP</th>
                            <th>Sale Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(saleDetails.get(sale.id) || []).map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.product_name || 'N/A'}</td>
                              <td>{item.qty}</td>
                              <td>৳{item.mrp.toFixed(2)}</td>
                              <td>৳{item.sale_price.toFixed(2)}</td>
                              <td>৳{(item.qty * item.sale_price).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

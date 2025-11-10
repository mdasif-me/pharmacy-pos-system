import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { showError, showSuccess } from '../../../utils/alerts'
import './CreateSaleModal.css'

interface SaleItem {
  product_id: number
  product_name?: string
  qty: number
  mrp: number
  sale_price: number
}

interface CreateSaleModalProps {
  onClose: () => void
  onSaleCreated: () => void
}

export const CreateSaleModal: React.FC<CreateSaleModalProps> = ({ onClose, onSaleCreated }) => {
  const [customerPhone, setCustomerPhone] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const searchProducts = async () => {
      if (!searchTerm.trim()) {
        setProducts([])
        return
      }

      setIsSearching(true)
      try {
        const result = await window.electron.searchProducts(searchTerm)
        setProducts(result || [])
      } catch (error) {
        console.error('Search error:', error)
        showError('Search Error', 'Failed to search products')
      } finally {
        setIsSearching(false)
      }
    }

    const timeout = setTimeout(searchProducts, 300)
    return () => clearTimeout(timeout)
  }, [searchTerm])

  const handleAddProduct = useCallback(
    (product: Product) => {
      const existingItem = saleItems.find((item) => item.product_id === product.id)

      if (existingItem) {
        setSaleItems(
          saleItems.map((item) =>
            item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item
          )
        )
      } else {
        setSaleItems([
          ...saleItems,
          {
            product_id: product.id,
            product_name: product.product_name,
            qty: 1,
            mrp: product.mrp || 0,
            sale_price: product.sale_price || product.mrp || 0,
          },
        ])
      }

      setSearchTerm('')
      setProducts([])
    },
    [saleItems]
  )

  const handleRemoveItem = useCallback(
    (productId: number) => {
      setSaleItems(saleItems.filter((item) => item.product_id !== productId))
    },
    [saleItems]
  )

  const handleUpdateQty = useCallback(
    (productId: number, qty: number) => {
      if (qty <= 0) {
        handleRemoveItem(productId)
        return
      }

      setSaleItems(
        saleItems.map((item) => (item.product_id === productId ? { ...item, qty } : item))
      )
    },
    [saleItems, handleRemoveItem]
  )

  const handleUpdatePrice = useCallback(
    (productId: number, salePrice: number) => {
      setSaleItems(
        saleItems.map((item) =>
          item.product_id === productId ? { ...item, sale_price: salePrice } : item
        )
      )
    },
    [saleItems]
  )

  const totals = useMemo(() => {
    let grandTotal = 0
    let discountTotal = 0

    saleItems.forEach((item) => {
      const itemTotal = item.qty * item.sale_price
      const itemMRPTotal = item.qty * item.mrp
      grandTotal += itemTotal
      discountTotal += itemMRPTotal - itemTotal
    })

    return { grandTotal, discountTotal }
  }, [saleItems])

  const handleCreateSale = useCallback(async () => {
    if (saleItems.length === 0) {
      showError('Validation Error', 'Please add at least one item')
      return
    }

    setIsLoading(true)
    try {
      const payload = {
        customer_phone_number: customerPhone || undefined,
        sale_items: saleItems.map((item) => ({
          product_id: item.product_id,
          qty: item.qty,
          mrp: item.mrp,
          sale_price: item.sale_price,
        })),
        grand_total: totals.grandTotal,
        grand_discount_total: totals.discountTotal,
      }

      const result = await window.electron.sales.create(payload)

      if (result.success) {
        showSuccess('Success', `Sale #${result.data.id} created successfully!`)
        onSaleCreated()
      }
    } catch (error: any) {
      console.error('Create sale error:', error)
      showError('Error', error.message || 'Failed to create sale')
    } finally {
      setIsLoading(false)
    }
  }, [saleItems, customerPhone, totals, onSaleCreated])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Sale</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Customer Phone */}
          <div className="form-group">
            <label>Customer Phone (Optional)</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Enter customer phone number"
            />
          </div>

          {/* Product Search */}
          <div className="form-group">
            <label>Search Products</label>
            <div className="search-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name..."
                autoComplete="off"
              />
              {isSearching && <div className="spinner"></div>}
            </div>

            {products.length > 0 && (
              <div className="search-results">
                {products.slice(0, 10).map((product) => (
                  <div
                    key={product.id}
                    className="search-result-item"
                    onClick={() => handleAddProduct(product)}
                  >
                    <div className="product-info">
                      <h4>{product.product_name}</h4>
                      <p>{product.company_name}</p>
                    </div>
                    <div className="product-price">
                      <span>৳{product.sale_price || product.mrp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sale Items */}
          <div className="form-group">
            <label>Sale Items ({saleItems.length})</label>
            <div className="sale-items-container">
              {saleItems.length === 0 ? (
                <p className="no-items">No items added yet</p>
              ) : (
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>MRP</th>
                      <th>Sale Price</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item) => (
                      <tr key={item.product_id}>
                        <td>{item.product_name}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateQty(item.product_id, parseInt(e.target.value) || 1)
                            }
                            className="qty-input"
                          />
                        </td>
                        <td>৳{item.mrp.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={item.sale_price}
                            onChange={(e) =>
                              handleUpdatePrice(item.product_id, parseFloat(e.target.value) || 0)
                            }
                            className="price-input"
                          />
                        </td>
                        <td>৳{(item.qty * item.sale_price).toFixed(2)}</td>
                        <td>
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleRemoveItem(item.product_id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Totals */}
          {saleItems.length > 0 && (
            <div className="totals-section">
              <div className="total-row">
                <span>Grand Total (MRP):</span>
                <strong>৳{(totals.grandTotal + totals.discountTotal).toFixed(2)}</strong>
              </div>
              <div className="total-row">
                <span>Discount:</span>
                <strong>৳{totals.discountTotal.toFixed(2)}</strong>
              </div>
              <div className="total-row highlight">
                <span>Final Total:</span>
                <strong>৳{totals.grandTotal.toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateSale}
            disabled={isLoading || saleItems.length === 0}
          >
            {isLoading ? 'Creating...' : 'Create Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}

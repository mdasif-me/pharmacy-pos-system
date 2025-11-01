// EnhancedDashboard - Complete example using all new components and hooks

import React, { useEffect, useState } from 'react'
import { ProductEntity } from '../../electron/types/entities/product.types'
import { useProducts } from '../hooks/useProducts'
import { Button, Modal } from './common'
import './EnhancedDashboard.css'
import { ProductForm, ProductList, SyncIndicator } from './features'

export const EnhancedDashboard: React.FC = () => {
  const {
    products,
    stats,
    isLoading,
    error,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    loadStats,
  } = useProducts(true)

  const [showProductForm, setShowProductForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductEntity | null>(null)
  const [showProductDetails, setShowProductDetails] = useState(false)

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Reload stats when products change
  useEffect(() => {
    if (products.length > 0) {
      loadStats()
    }
  }, [products.length, loadStats])

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setShowProductForm(true)
  }

  const handleEditProduct = (product: ProductEntity) => {
    setSelectedProduct(product)
    setShowProductForm(true)
  }

  const handleProductClick = (product: ProductEntity) => {
    setSelectedProduct(product)
    setShowProductDetails(true)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedProduct) {
        await updateProduct(selectedProduct.id, data)
        alert('Product updated successfully!')
      } else {
        await createProduct(data)
        alert('Product created successfully!')
      }
      setShowProductForm(false)
      await loadProducts()
      await loadStats()
    } catch (error) {
      alert('Failed to save product: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    if (confirm(`Are you sure you want to delete "${selectedProduct.product_name}"?`)) {
      try {
        await deleteProduct(selectedProduct.id)
        alert('Product deleted successfully!')
        setShowProductDetails(false)
        setSelectedProduct(null)
        await loadProducts()
        await loadStats()
      } catch (error) {
        alert(
          'Failed to delete product: ' + (error instanceof Error ? error.message : 'Unknown error')
        )
      }
    }
  }

  return (
    <div className="enhanced-dashboard">
      {/* Header with Stats */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Product Management</h1>
        <div className="dashboard-stats">
          {stats && (
            <>
              <div className="stat-card">
                <div className="stat-label">Total Products</div>
                <div className="stat-value">{stats.total}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">In Stock</div>
                <div className="stat-value">{stats.inStock}</div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-label">Low Stock</div>
                <div className="stat-value">{stats.lowStock}</div>
              </div>
              <div className="stat-card stat-danger">
                <div className="stat-label">Out of Stock</div>
                <div className="stat-value">{stats.outOfStock}</div>
              </div>
              <div className="stat-card stat-success">
                <div className="stat-label">Total Value</div>
                <div className="stat-value">₹{stats.totalValue?.toFixed(2) || '0.00'}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sync Status */}
      <div className="dashboard-sync">
        <SyncIndicator showDetails showControls />
      </div>

      {/* Error Display */}
      {error && (
        <div className="dashboard-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Product List */}
      <div className="dashboard-content">
        <ProductList
          onProductClick={handleProductClick}
          onAddProduct={handleAddProduct}
          showSearch
          showActions
        />
      </div>

      {/* Product Form Modal */}
      <ProductForm
        isOpen={showProductForm}
        onClose={() => setShowProductForm(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedProduct || undefined}
        mode={selectedProduct ? 'edit' : 'create'}
      />

      {/* Product Details Modal */}
      <Modal
        isOpen={showProductDetails}
        onClose={() => setShowProductDetails(false)}
        title="Product Details"
        size="large"
      >
        {selectedProduct && (
          <div className="product-details">
            <div className="product-details-grid">
              <div className="detail-item">
                <strong>ID:</strong> {selectedProduct.id}
              </div>
              <div className="detail-item">
                <strong>Product Name:</strong> {selectedProduct.product_name}
              </div>
              <div className="detail-item">
                <strong>Generic Name:</strong> {selectedProduct.generic_name || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Company:</strong> Company ID: {selectedProduct.company_id}
              </div>
              <div className="detail-item">
                <strong>Category:</strong>{' '}
                {selectedProduct.category_id
                  ? `Category ID: ${selectedProduct.category_id}`
                  : 'N/A'}
              </div>
              <div className="detail-item">
                <strong>MRP:</strong> ₹{selectedProduct.mrp?.toFixed(2) || '0.00'}
              </div>
              <div className="detail-item">
                <strong>Sale Price:</strong> ₹{selectedProduct.sale_price?.toFixed(2) || '0.00'}
              </div>
              <div className="detail-item">
                <strong>Discount Price:</strong> ₹
                {selectedProduct.discount_price?.toFixed(2) || '0.00'}
              </div>
              <div className="detail-item">
                <strong>In Stock:</strong> {selectedProduct.in_stock || 0}
              </div>
              <div className="detail-item">
                <strong>Stock Alert:</strong> {selectedProduct.stock_alert || 10}
              </div>
              <div className="detail-item">
                <strong>Type:</strong> {selectedProduct.type || 'medicine'}
              </div>
              <div className="detail-item">
                <strong>Prescription:</strong>{' '}
                {selectedProduct.prescription ? 'Required' : 'Not Required'}
              </div>
              <div className="detail-item">
                <strong>Status:</strong> {selectedProduct.status || 'active'}
              </div>
            </div>

            <div className="product-details-actions">
              <Button variant="secondary" onClick={() => setShowProductDetails(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowProductDetails(false)
                  handleEditProduct(selectedProduct)
                }}
              >
                Edit
              </Button>
              <Button variant="danger" onClick={handleDeleteProduct}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

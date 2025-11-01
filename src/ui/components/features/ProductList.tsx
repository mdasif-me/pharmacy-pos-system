// ProductList - feature component for displaying products

import React, { useState } from 'react'
import { ProductEntity } from '../../../electron/types/entities/product.types'
import { useSearch } from '../../hooks/useSearch'
import { Button, SearchBox, Table, TableColumn } from '../common'
import './ProductList.css'

export interface ProductListProps {
  onProductClick?: (product: ProductEntity) => void
  onAddProduct?: () => void
  showSearch?: boolean
  showActions?: boolean
}

export const ProductList: React.FC<ProductListProps> = ({
  onProductClick,
  onAddProduct,
  showSearch = true,
  showActions = true,
}) => {
  const { query, results, isLoading, search, clearSearch } = useSearch()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = async (value: string) => {
    if (value.trim()) {
      await search(value)
    } else {
      clearSearch()
    }
  }

  const columns: TableColumn<ProductEntity>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '80px',
      align: 'center',
    },
    {
      key: 'product_name',
      header: 'Product Name',
    },
    {
      key: 'generic_name',
      header: 'Generic Name',
    },
    {
      key: 'company_name',
      header: 'Company',
    },
    {
      key: 'mrp',
      header: 'MRP',
      width: '100px',
      align: 'right',
      render: (product) => `₹${product.mrp?.toFixed(2) || '0.00'}`,
    },
    {
      key: 'in_stock',
      header: 'Stock',
      width: '100px',
      align: 'center',
      render: (product) => (
        <span
          className={`stock-badge ${(product.in_stock || 0) < (product.stock_alert || 10) ? 'low-stock' : ''}`}
        >
          {product.in_stock || 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      align: 'center',
      render: (product) => (
        <span className={`status-badge status-${product.status}`}>
          {product.status || 'active'}
        </span>
      ),
    },
  ]

  return (
    <div className="product-list">
      {showSearch && (
        <div className="product-list-header">
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            placeholder="Search products by name, generic name, or company..."
            isLoading={isLoading}
            fullWidth
          />
          {showActions && onAddProduct && (
            <Button onClick={onAddProduct} variant="primary">
              + Add Product
            </Button>
          )}
        </div>
      )}

      <div className="product-list-content">
        <Table
          data={results}
          columns={columns}
          onRowClick={onProductClick}
          isLoading={isLoading}
          emptyMessage={query ? 'No products found matching your search' : 'No products available'}
          keyExtractor={(product) => product.id}
        />
      </div>
    </div>
  )
}

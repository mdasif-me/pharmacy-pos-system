// ProductForm - feature component for creating/editing products

import React, { useState } from 'react'
import { ProductCreateDTO, ProductUpdateDTO } from '../../../electron/types/entities/product.types'
import { Button, Input, Modal } from '../common'
import './ProductForm.css'

export interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProductCreateDTO | ProductUpdateDTO) => Promise<void>
  initialData?: ProductUpdateDTO
  mode?: 'create' | 'edit'
}

export const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}) => {
  const [formData, setFormData] = useState<Partial<ProductCreateDTO>>({
    product_name: initialData?.product_name || '',
    generic_name: initialData?.generic_name || '',
    company_id: initialData?.company_id || 0,
    company_name: initialData?.company_name || '',
    category_id: initialData?.category_id || undefined,
    category_name: initialData?.category_name || '',
    mrp: initialData?.mrp || 0,
    sale_price: initialData?.sale_price || 0,
    discount_price: initialData?.discount_price || 0,
    in_stock: initialData?.in_stock || 0,
    stock_alert: initialData?.stock_alert || 10,
    type: initialData?.type || 'medicine',
    prescription: initialData?.prescription || 0,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.product_name?.trim()) {
      newErrors.product_name = 'Product name is required'
    }
    if (!formData.company_id || formData.company_id === 0) {
      newErrors.company_id = 'Company is required'
    }
    if (!formData.mrp || formData.mrp <= 0) {
      newErrors.mrp = 'MRP must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(formData as ProductCreateDTO)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Product' : 'Edit Product'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          <Input
            label="Product Name *"
            value={formData.product_name || ''}
            onChange={(e) => handleChange('product_name', e.target.value)}
            error={errors.product_name}
            fullWidth
          />

          <Input
            label="Generic Name"
            value={formData.generic_name || ''}
            onChange={(e) => handleChange('generic_name', e.target.value)}
            fullWidth
          />

          <Input
            label="Company ID *"
            type="number"
            value={formData.company_id || ''}
            onChange={(e) => handleChange('company_id', parseInt(e.target.value) || 0)}
            error={errors.company_id}
            fullWidth
          />

          <Input
            label="Company Name"
            value={formData.company_name || ''}
            onChange={(e) => handleChange('company_name', e.target.value)}
            fullWidth
          />

          <Input
            label="Category ID"
            type="number"
            value={formData.category_id || ''}
            onChange={(e) => handleChange('category_id', parseInt(e.target.value) || undefined)}
            fullWidth
          />

          <Input
            label="Category Name"
            value={formData.category_name || ''}
            onChange={(e) => handleChange('category_name', e.target.value)}
            fullWidth
          />

          <Input
            label="MRP *"
            type="number"
            step="0.01"
            value={formData.mrp || ''}
            onChange={(e) => handleChange('mrp', parseFloat(e.target.value) || 0)}
            error={errors.mrp}
            fullWidth
          />

          <Input
            label="Sale Price"
            type="number"
            step="0.01"
            value={formData.sale_price || ''}
            onChange={(e) => handleChange('sale_price', parseFloat(e.target.value) || 0)}
            fullWidth
          />

          <Input
            label="Discount Price"
            type="number"
            step="0.01"
            value={formData.discount_price || ''}
            onChange={(e) => handleChange('discount_price', parseFloat(e.target.value) || 0)}
            fullWidth
          />

          <Input
            label="In Stock"
            type="number"
            value={formData.in_stock || ''}
            onChange={(e) => handleChange('in_stock', parseInt(e.target.value) || 0)}
            fullWidth
          />

          <Input
            label="Stock Alert Level"
            type="number"
            value={formData.stock_alert || ''}
            onChange={(e) => handleChange('stock_alert', parseInt(e.target.value) || 10)}
            fullWidth
          />

          <div className="form-field-full">
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={formData.prescription === 1}
                onChange={(e) => handleChange('prescription', e.target.checked ? 1 : 0)}
              />
              Requires Prescription
            </label>
          </div>
        </div>

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {mode === 'create' ? 'Create Product' : 'Update Product'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import Mobile from '../../../assets/mobile.svg'
import Search from '../../../assets/search.svg'
import { generateAndDownloadPDF } from '../../../utils/pdfGenerator'
import './PosView.css'

interface Product {
  id: number
  product_name: string
  company_name: string
  mrp: number
  in_stock?: number
  type: string
  quantity?: string
  generic_name?: string
  discount_price?: number
  peak_hour_price?: number
  mediboy_offer_price?: number
}

interface CartItem extends Product {
  cartQuantity: number
  total: number
  salePrice: number // The actual price used for this sale
  selectedBatch?: any // Store selected batch info
}

interface StatCardProps {
  title: string
  value: string
  helper: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, helper }) => (
  <div className="stat-card">
    <h4>{title}</h4>
    <span className="stat-card-value">{value}</span>
    <p className="stat-card-helper">{helper}</p>
  </div>
)

interface OrderDetail {
  productDescription: string
  companyName: string
  rate: number
  quantity: number
  total: number
}

export const PosView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantityInput, setQuantityInput] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingQuantity, setEditingQuantity] = useState('')
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [availableBatches, setAvailableBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const searchDebounceRef = useRef<number | undefined>(undefined)
  const searchCloseTimeoutRef = useRef<number | undefined>(undefined)
  const orderSearchDebounceRef = useRef<number | undefined>(undefined)
  const orderSearchCloseTimeoutRef = useRef<number | undefined>(undefined)

  const handleSearchFocus = () => {
    if (searchCloseTimeoutRef.current) {
      window.clearTimeout(searchCloseTimeoutRef.current)
      searchCloseTimeoutRef.current = undefined
    }
    setIsSearchOpen(true)
  }

  const handleSearchBlur = () => {
    if (searchCloseTimeoutRef.current) {
      window.clearTimeout(searchCloseTimeoutRef.current)
    }
    searchCloseTimeoutRef.current = window.setTimeout(() => {
      setIsSearchOpen(false)
      setSuggestions([])
    }, 150)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsSearchOpen(false)
      setSuggestions([])
    }
  }

  const closeSuggestions = useCallback(() => {
    if (searchCloseTimeoutRef.current) {
      window.clearTimeout(searchCloseTimeoutRef.current)
      searchCloseTimeoutRef.current = undefined
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = undefined
    }

    setIsSearchOpen(false)
    setSuggestions([])
  }, [])

  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product)
    setSearchTerm(product.product_name ?? '')
    setQuantityInput('')
    setSelectedBatch(null)
    closeSuggestions()

    // Fetch available batches for this product
    try {
      setIsLoadingBatches(true)
      const response: any = await window.electron.batches.getAvailable(product.id)
      console.log('[PosView] Batch response:', response, 'Type:', typeof response)

      // Handle both direct array and wrapped response object
      let batchesArray: any[] = []
      if (Array.isArray(response)) {
        batchesArray = response
      } else if (response && typeof response === 'object' && response.data) {
        batchesArray = Array.isArray(response.data) ? response.data : []
      }

      console.log(
        '[PosView] Setting batches:',
        batchesArray,
        'IsArray:',
        Array.isArray(batchesArray)
      )
      setAvailableBatches(batchesArray)
    } catch (error) {
      console.error('Error fetching batches:', error)
      setAvailableBatches([])
    } finally {
      setIsLoadingBatches(false)
    }
  }

  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [pendingCartItem, setPendingCartItem] = useState<{
    product: Product
    qty: number
    baseSalePrice: number
    basedOn: 'custom' | 'discount' | 'peak_hour'
  } | null>(null)
  const [priceModalError, setPriceModalError] = useState('')
  const [priceModalWarning, setPriceModalWarning] = useState('')
  const [priceModalInput, setPriceModalInput] = useState('')

  // Helper function to validate price in real-time
  const validatePriceInput = (value: string) => {
    if (!pendingCartItem) return

    const price = Number.parseFloat(value)
    const mrp = pendingCartItem.product.mrp
    const mediboyPrice = pendingCartItem.product.mediboy_offer_price || 0
    const basePrice = pendingCartItem.baseSalePrice

    // Clear previous messages
    setPriceModalError('')
    setPriceModalWarning('')

    if (value === '' || Number.isNaN(price)) {
      return // Allow empty input, validate on confirm
    }

    if (price <= 0) {
      setPriceModalError('Price must be greater than 0')
      return
    }

    if (price > mrp) {
      setPriceModalError(`❌ Price cannot exceed MRP (৳${mrp.toFixed(2)})`)
      return
    }

    if (mediboyPrice > 0 && price <= mediboyPrice) {
      setPriceModalError(`❌ Price must be > Mediboy Price (৳${mediboyPrice.toFixed(2)})`)
      return
    }

    if (price < basePrice) {
      setPriceModalWarning(
        `⚠️ Below base price (৳${basePrice.toFixed(2)}) - You'll need to confirm`
      )
    }
  }

  const handleAddToCart = async () => {
    if (!selectedProduct) {
      Swal.fire({
        icon: 'error',
        title: 'No Product Selected',
        text: 'Please select a product before adding to the cart.',
      })
      return
    }

    if (Array.isArray(availableBatches) && availableBatches.length > 0 && !selectedBatch) {
      Swal.fire({
        icon: 'warning',
        title: 'Batch Required',
        text: 'Please select a batch for this product before adding to the cart.',
      })
      return
    }

    const qty = Number.parseInt(quantityInput, 10)
    if (Number.isNaN(qty) || qty <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Quantity',
        text: 'Please enter a valid quantity greater than 0.',
      })
      return
    }

    const inStock = selectedProduct.in_stock ?? 0
    if (qty > inStock) {
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit Exceeded',
        text: `Only ${inStock} items are in stock.`,
      })
      return
    }

    // Check if product already exists in cart
    const existingIndex = cartItems.findIndex((item) => item.id === selectedProduct.id)
    if (existingIndex >= 0) {
      Swal.fire({
        icon: 'info',
        title: 'Product Already in Cart',
        text: 'This product is already in the cart. You can update the quantity directly.',
      })
      return
    }

    // Get sale price based on sale mode
    try {
      const priceInfo = await window.electron.businessSetup.getSalePrice(selectedProduct.id)
      setPendingCartItem({
        product: selectedProduct,
        qty,
        baseSalePrice: priceInfo.salePrice,
        basedOn: priceInfo.basedOn,
      })
      setPriceModalInput(priceInfo.salePrice.toString())
      setPriceModalError('')
      setPriceModalOpen(true)
    } catch (error: any) {
      console.error('Error getting sale price:', error)
      Swal.fire({
        icon: 'error',
        title: 'Price Error',
        text: error.message || 'Unable to determine sale price',
      })
    }
  }

  const handlePriceConfirm = async () => {
    if (!pendingCartItem) return

    const customPrice = Number.parseFloat(priceModalInput)

    // Validation: Price must be a valid number greater than 0
    if (Number.isNaN(customPrice) || customPrice <= 0) {
      setPriceModalError('Please enter a valid price greater than 0')
      return
    }

    // Validation: Price cannot exceed MRP
    const mrp = pendingCartItem.product.mrp
    if (customPrice > mrp) {
      setPriceModalError(`Sale price cannot exceed MRP (৳${mrp.toFixed(2)})`)
      return
    }

    // Validation: Sale price must be > mediboy offer price (if set)
    const mediboyOfferPrice = pendingCartItem.product.mediboy_offer_price || 0
    if (mediboyOfferPrice > 0 && customPrice <= mediboyOfferPrice) {
      setPriceModalError(
        `Sale price must be greater than mediboy offer price (৳${mediboyOfferPrice.toFixed(2)})`
      )
      return
    }

    // Validation: Sale price should not be less than base sale price (warning - allowed but informed)
    if (customPrice < pendingCartItem.baseSalePrice) {
      const confirmed = await Swal.fire({
        icon: 'warning',
        title: 'Price Below Base Price',
        html: `<p>Sale price (৳${customPrice.toFixed(
          2
        )}) is below the base sale price (৳${pendingCartItem.baseSalePrice.toFixed(
          2
        )}).</p><p>Do you want to proceed?</p>`,
        confirmButtonText: 'Yes, Proceed',
        cancelButtonText: 'No, Edit',
        showCancelButton: true,
      })

      if (!confirmed.isConfirmed) {
        return
      }
    }

    const newItem: CartItem = {
      ...pendingCartItem.product,
      cartQuantity: pendingCartItem.qty,
      salePrice: customPrice,
      total: pendingCartItem.qty * customPrice,
      selectedBatch: selectedBatch,
    }
    setCartItems([...cartItems, newItem])

    setQuantityInput('')
    setSelectedProduct(null)
    setSearchTerm('')
    setSelectedBatch(null)
    setAvailableBatches([])
    setPriceModalOpen(false)
    setPendingCartItem(null)
    setPriceModalInput('')
    setPriceModalError('')
  }

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index))
    setEditingIndex(null)
  }

  const handleEditQuantity = (index: number, newQty: number) => {
    const item = cartItems[index]
    const inStock = item.in_stock ?? 0

    if (newQty > inStock) {
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit Exceeded',
        text: `Only ${inStock} items are in stock.`,
      })
      return
    }

    if (newQty <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Quantity',
        text: 'Quantity must be greater than 0.',
      })
      return
    }

    const updatedCart = [...cartItems]
    updatedCart[index].cartQuantity = newQty
    updatedCart[index].total = newQty * updatedCart[index].salePrice
    setCartItems(updatedCart)
    setEditingIndex(null)
  }

  const handleOrderSearchFocus = () => {
    if (orderSearchCloseTimeoutRef.current) {
      window.clearTimeout(orderSearchCloseTimeoutRef.current)
      orderSearchCloseTimeoutRef.current = undefined
    }
    setIsOrderSearchOpen(true)
  }

  const handleOrderSearchBlur = () => {
    if (orderSearchCloseTimeoutRef.current) {
      window.clearTimeout(orderSearchCloseTimeoutRef.current)
    }
    orderSearchCloseTimeoutRef.current = window.setTimeout(() => {
      setIsOrderSearchOpen(false)
      setOrderSearchResults([])
    }, 150)
  }

  const handleOrderSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOrderSearchOpen(false)
      setOrderSearchResults([])
    }
  }

  const handleOrderSearchByNumber = useCallback(async (search: string) => {
    if (search.length < 4) {
      setOrderSearchResults([])
      setIsOrderSearchOpen(false)
      return
    }
    setIsOrderSearching(true)
    setIsOrderSearchOpen(true) // Open immediately when searching starts
    try {
      const results = await window.electron.orders.searchByNumber(search)
      console.log('[PosView] Order search results:', results)
      console.log('[PosView] Setting results and opening dropdown')
      setOrderSearchResults(results || [])
      setIsOrderSearchOpen(true) // Ensure it stays open after results
    } catch (error: any) {
      console.error('Error searching orders:', error)
      Swal.fire({
        icon: 'error',
        title: 'Search Error',
        text: 'Failed to search orders. Please try again.',
      })
      setOrderSearchResults([])
      setIsOrderSearchOpen(true)
    } finally {
      setIsOrderSearching(false)
    }
  }, [])

  useEffect(() => {
    if (orderSearchDebounceRef.current) {
      window.clearTimeout(orderSearchDebounceRef.current)
    }

    if (orderSearchTerm.length < 4) {
      setOrderSearchResults([])
      setIsOrderSearchOpen(false)
      return
    }

    setIsOrderSearching(true)
    orderSearchDebounceRef.current = window.setTimeout(() => {
      handleOrderSearchByNumber(orderSearchTerm)
    }, 500)

    return () => {
      if (orderSearchDebounceRef.current) {
        window.clearTimeout(orderSearchDebounceRef.current)
      }
    }
  }, [orderSearchTerm, handleOrderSearchByNumber])

  const selectOrder = async (order: any) => {
    setSelectedOrder(order)
    setIsLoadingOrderDetails(true)
    try {
      const response: any = await window.electron.orders.getDetails(order.id)
      console.log('[PosView] Order details response:', response)

      // Handle nested response structure: { order: [{...}] }
      let orderData = response
      if (
        response &&
        response.order &&
        Array.isArray(response.order) &&
        response.order.length > 0
      ) {
        orderData = response.order[0]
      }

      // Transform API response to match component expectations
      const transformedDetails = {
        id: orderData.id,
        order_number: orderData.orderNo || orderData.order_number,
        order_status: orderData.status || orderData.order_status,
        order_type: orderData.type || orderData.order_type,
        customer: {
          id: orderData.user_id || orderData.users?.id,
          name: `${orderData.users?.firstName || ''} ${orderData.users?.lastName || ''}`.trim(),
          phone: orderData.users?.phoneNumber || '',
          email: orderData.users?.email || '',
        },
        items: orderData.order_items || orderData.items || [],
        total_amount: orderData.offer_grandTotal || orderData.total_amount,
        offer_total_amount: orderData.offer_total_amount,
        created_at: orderData.created_at,
      }

      // Transform order items to match component expectations
      transformedDetails.items = transformedDetails.items.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product?.productName || item.product_name,
        generic_name: item.product?.generic_name || '',
        company_name: item.product?.company?.name || item.company_name,
        max_retail_price: item.product?.mrp || item.discount_unit_price || 0,
        sale_price: item.offer_unit_price || item.sale_price || 0,
        quantity: item.quantity,
        batch_number: item.batch_number,
      }))

      setOrderDetails(transformedDetails)
      setContactPhone(transformedDetails.customer.phone)

      // Determine pickup method based on order type and status
      if (
        transformedDetails.order_type &&
        transformedDetails.order_type.toLowerCase() === 'self_pickup'
      ) {
        setPickupMethod('self_pick')
      } else if (
        transformedDetails.order_type &&
        transformedDetails.order_type.toLowerCase() === 'home_delivery'
      ) {
        if (
          transformedDetails.order_status &&
          transformedDetails.order_status.toLowerCase() === 'processing'
        ) {
          setPickupMethod('rider_pick')
        }
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load order details. Please try again.',
      })
    } finally {
      setIsLoadingOrderDetails(false)
    }
    setOrderSearchResults([])
    setIsOrderSearchOpen(false)
  }

  const handleOrderSale = async () => {
    if (!selectedOrder || !orderDetails) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please select an order first.',
      })
      return
    }

    if (!pickupMethod) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Pickup method not determined from order details.',
      })
      return
    }

    if (cartItems.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Empty Cart',
        text: 'Please add items to the cart before completing the sale.',
      })
      return
    }

    const { grandTotal: calcTotal, grandDiscountTotal: calcDiscount } = calculateTotals()

    // Prepare sale items
    const saleItems = cartItems
      .filter((item) => item.cartQuantity > 0)
      .map((item) => ({
        product_id: item.id,
        max_retail_price: item.mrp,
        sale_price: item.salePrice,
        quantity: item.cartQuantity,
      }))

    if (saleItems.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Sale',
        text: 'No valid items in cart to process.',
      })
      return
    }

    setIsSalesProcessing(true)

    try {
      const result = await window.electron.orders.createOnlineSale({
        orderId: selectedOrder.id,
        pickupValue: pickupMethod,
        saleItems,
      })

      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Online Sale Completed',
          html: `
            <div style="text-align: left; font-size: 14px;">
              <p><strong>Order Number:</strong> ${selectedOrder.order_number}</p>
              <p><strong>Sale ID:</strong> ${result.saleId}</p>
              <p><strong>Total MRP:</strong> ৳${calcTotal.toFixed(2)}</p>
              <p><strong>Total Discount:</strong> ৳${calcDiscount.toFixed(2)}</p>
              <p><strong>Pickup Method:</strong> ${
                pickupMethod === 'self_pick' ? 'Self-Pick' : 'Rider Pick'
              }</p>
              <p style="color: #28a745; margin-top: 10px;">
                ${result.message}
              </p>
            </div>
          `,
          confirmButtonText: 'OK',
        }).then(() => {
          // Reset form
          setCartItems([])
          setSelectedOrder(null)
          setOrderDetails(null)
          setOrderSearchTerm('')
          setPickupMethod(null)
          setSelectedProduct(null)
          setQuantityInput('')
          setSearchTerm('')
        })
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Sale Partially Completed',
          text: result.message || 'Sale was completed but with warnings.',
        })
      }
    } catch (error: any) {
      console.error('Error completing online sale:', error)
      Swal.fire({
        icon: 'error',
        title: 'Sale Error',
        text: error.message || 'Failed to complete the online sale. Please try again.',
      })
    } finally {
      setIsSalesProcessing(false)
    }
  }

  useEffect(() => {
    if (!isSearchOpen) {
      return undefined
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
    }

    setIsSearching(true)
    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const query = searchTerm.trim()
        console.log('Searching for:', query)
        const products = await window.electron.searchProducts(query)
        console.log('Search results:', products)
        setSuggestions(products ?? [])
      } catch (error) {
        console.error('product search failed:', error)
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current)
      }
    }
  }, [isSearchOpen, searchTerm])

  useEffect(() => {
    if (isSearchOpen) {
      return
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = undefined
    }

    if (searchCloseTimeoutRef.current) {
      window.clearTimeout(searchCloseTimeoutRef.current)
      searchCloseTimeoutRef.current = undefined
    }

    setIsSearching(false)
    setSuggestions([])
  }, [isSearchOpen])

  // Order search and online sale state
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false)
  const [pickupMethod, setPickupMethod] = useState<'self_pick' | 'rider_pick' | null>(null)
  const [orderSearchResults, setOrderSearchResults] = useState<any[]>([])
  const [isOrderSearching, setIsOrderSearching] = useState(false)
  const [isOrderSearchOpen, setIsOrderSearchOpen] = useState(false)

  const [contactPhone, setContactPhone] = useState('')
  const [isSalesProcessing, setIsSalesProcessing] = useState(false)

  const calculateTotals = () => {
    if (cartItems.length === 0) {
      return { grandTotal: 0, grandDiscountTotal: 0, netPrice: 0 }
    }

    // Grand Total MRP = sum of (MRP * quantity) for all items
    const grandTotal = cartItems.reduce((sum, item) => {
      return sum + item.mrp * item.cartQuantity
    }, 0)

    // Grand Discount Total = sum of ((MRP - sale_price) * quantity) for all items
    const grandDiscountTotal = cartItems.reduce((sum, item) => {
      const discountPerUnit = item.mrp - item.salePrice
      return sum + discountPerUnit * item.cartQuantity
    }, 0)

    // Net Price = Grand Total - Grand Discount Total
    const netPrice = grandTotal - grandDiscountTotal

    return { grandTotal, grandDiscountTotal, netPrice }
  }

  const handleSoldOut = async () => {
    if (cartItems.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Empty Cart',
        text: 'Please add items to the cart before completing the sale.',
      })
      return
    }

    if (!contactPhone.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter customer phone number for the sale.',
      })
      return
    }

    const { grandTotal, grandDiscountTotal, netPrice } = calculateTotals()

    // Prepare sale items
    const saleItems = cartItems
      .filter((item) => item.cartQuantity > 0)
      .map((item) => ({
        product_id: item.id,
        max_retail_price: item.mrp,
        sale_price: item.salePrice,
        quantity: item.cartQuantity,
      }))

    if (saleItems.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Sale',
        text: 'No valid items in cart to process.',
      })
      return
    }

    setIsSalesProcessing(true)

    try {
      const result = await window.electron.sales.createDirectOffline({
        grandTotal,
        grandDiscountTotal,
        customerPhoneNumber: contactPhone.trim(),
        saleItems,
      })

      if (result.success) {
        // Show success message with bill details
        Swal.fire({
          icon: 'success',
          title: 'Sale Completed Successfully',
          html: `
            <div style="text-align: left; font-size: 14px;">
              <p><strong>Sale ID:</strong> ${result.saleId}</p>
              <p><strong>Total MRP:</strong> ৳${grandTotal.toFixed(2)}</p>
              <p><strong>Total Discount:</strong> ৳${grandDiscountTotal.toFixed(2)}</p>
              <p><strong>Net Amount:</strong> ৳${netPrice.toFixed(2)}</p>
              <p><strong>Customer:</strong> ${contactPhone}</p>
              <p style="color: #28a745; margin-top: 10px;">
                ${result.message}
              </p>
            </div>
          `,
          confirmButtonText: 'Download PDF Bill',
          cancelButtonText: 'New Sale',
          showCancelButton: true,
        }).then((confirmResult) => {
          if (confirmResult.isConfirmed) {
            // Generate and download PDF bill
            try {
              generateAndDownloadPDF(
                {
                  saleId: result.saleId,
                  customerPhone: contactPhone,
                  items: cartItems.map((item) => ({
                    product_name: item.product_name,
                    company_name: item.company_name,
                    quantity: item.cartQuantity,
                    mrp: item.mrp,
                    salePrice: item.salePrice,
                    total: item.total,
                    selectedBatch: item.selectedBatch,
                  })),
                  grandTotal,
                  grandDiscountTotal,
                  netPrice,
                  saleDate: new Date().toLocaleString('en-BD'),
                },
                'Mediboy Pharmacy'
              ).catch((error: any) => {
                Swal.fire({
                  icon: 'error',
                  title: 'PDF Generation Error',
                  text: 'Failed to generate PDF bill. Please try again.',
                })
                console.error('PDF generation error:', error)
              })
            } catch (error) {
              console.error('Error generating PDF:', error)
            }
          }

          // Reset cart and form
          setCartItems([])
          setContactPhone('')
          setQuantityInput('')
          setSelectedProduct(null)
          setSearchTerm('')
        })
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Sale Saved Locally',
          html: `
            <div style="text-align: left; font-size: 14px;">
              <p><strong>Sale ID:</strong> ${result.saleId}</p>
              <p><strong>Status:</strong> ${result.message}</p>
              <p><strong>Total MRP:</strong> ৳${grandTotal.toFixed(2)}</p>
              <p><strong>Total Discount:</strong> ৳${grandDiscountTotal.toFixed(2)}</p>
              <p><strong>Net Amount:</strong> ৳${netPrice.toFixed(2)}</p>
              <p style="color: #ff9800; margin-top: 10px;">
                Will sync when connection is available
              </p>
            </div>
          `,
          confirmButtonText: 'Download PDF Bill',
          cancelButtonText: 'New Sale',
          showCancelButton: true,
        }).then((confirmResult) => {
          if (confirmResult.isConfirmed) {
            // Generate and download PDF bill for local save
            try {
              generateAndDownloadPDF(
                {
                  saleId: result.saleId,
                  customerPhone: contactPhone,
                  items: cartItems.map((item) => ({
                    product_name: item.product_name,
                    company_name: item.company_name,
                    quantity: item.cartQuantity,
                    mrp: item.mrp,
                    salePrice: item.salePrice,
                    total: item.total,
                    selectedBatch: item.selectedBatch,
                  })),
                  grandTotal,
                  grandDiscountTotal,
                  netPrice,
                  saleDate: new Date().toLocaleString('en-BD'),
                },
                'Mediboy Pharmacy'
              ).catch((error: any) => {
                Swal.fire({
                  icon: 'error',
                  title: 'PDF Generation Error',
                  text: 'Failed to generate PDF bill. Please try again.',
                })
                console.error('PDF generation error:', error)
              })
            } catch (error) {
              console.error('Error generating PDF:', error)
            }
          }

          // Reset cart and form
          setCartItems([])
          setContactPhone('')
          setQuantityInput('')
          setSelectedProduct(null)
          setSearchTerm('')
        })
      }
    } catch (error: any) {
      console.error('Error completing sale:', error)
      Swal.fire({
        icon: 'error',
        title: 'Sale Error',
        text: error.message || 'Failed to complete the sale. Please try again.',
      })
    } finally {
      setIsSalesProcessing(false)
    }
  }

  const { grandTotal, grandDiscountTotal, netPrice } = calculateTotals()

  return (
    <main>
      <section className="pos-header">
        <div className="select-batch-bar">
          <h2>BTC</h2>
          <select
            value={selectedBatch ? selectedBatch.id : ''}
            onChange={(e) => {
              const batchId = e.target.value
              if (batchId && Array.isArray(availableBatches)) {
                const batch = availableBatches.find((b) => b.id === Number(batchId))
                setSelectedBatch(batch || null)
              } else {
                setSelectedBatch(null)
              }
            }}
            disabled={
              isLoadingBatches ||
              !Array.isArray(availableBatches) ||
              availableBatches.length === 0 ||
              !selectedProduct
            }
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor:
                !Array.isArray(availableBatches) || availableBatches.length === 0
                  ? '#f5f5f5'
                  : 'white',
              cursor:
                !Array.isArray(availableBatches) || availableBatches.length === 0
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '14px',
              minWidth: '200px',
            }}
          >
            <option value="">{isLoadingBatches ? 'Loading batches...' : 'Select a batch'}</option>
            {Array.isArray(availableBatches) && availableBatches.length > 0
              ? availableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_no} (Available: {batch.available}, Exp: {batch.exp})
                  </option>
                ))
              : null}
          </select>
        </div>
      </section>
      <section>
        <div className="input">
          <div className="input-section">
            <div className="product-search" style={{ position: 'relative' }}>
              <div className="search-icon">
                <img src={Search} alt="" />
              </div>
              <input
                type="search"
                placeholder="Search product..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
              />
              {isSearchOpen && (
                <ul className="search-suggestions">
                  {isSearching && suggestions.length === 0 && (
                    <li className="search-suggestion loading">searching...</li>
                  )}
                  {!isSearching && suggestions.length === 0 && (
                    <li className="search-suggestion empty">no products found</li>
                  )}
                  {suggestions.map((product) => {
                    return (
                      <li
                        key={product.id}
                        className="search-suggestion"
                        onMouseDown={(event) => {
                          event.preventDefault()
                          handleSelectProduct(product)
                        }}
                      >
                        <div className="search-suggestion-main">
                          <span className="search-suggestion-type">
                            {product.type ? `${product.type.slice(0, 3)}.` : ''}
                          </span>
                          <span className="search-suggestion-name">{product.product_name}</span>
                          {product.quantity && (
                            <span className="search-suggestion-quantity">{product.quantity}</span>
                          )}
                        </div>
                        <div className="search-suggestion-details">
                          <span className="search-suggestion-company">
                            {product.company_name || 'Unknown Company'}
                          </span>
                          <span className="search-suggestion-price">৳{product.mrp}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="qty-number">
              <h2>QTY*</h2>
              <input
                type="number"
                min="0"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              className="input-button"
              onClick={handleAddToCart}
              disabled={!selectedProduct || !quantityInput}
            >
              Add
            </button>
          </div>

          {/* Price Modal */}
          {priceModalOpen && pendingCartItem && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000,
              }}
              onClick={() => {
                setPriceModalOpen(false)
                setPendingCartItem(null)
                setPriceModalError('')
              }}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '24px',
                  maxWidth: '400px',
                  width: '90%',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                  Set Sale Price
                </h2>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    <strong>Product:</strong> {pendingCartItem.product.product_name}
                  </p>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    <strong>MRP:</strong> ৳{pendingCartItem.product.mrp}
                  </p>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    <strong>Base Sale Price ({pendingCartItem.basedOn}):</strong> ৳
                    {pendingCartItem.baseSalePrice.toFixed(2)}
                  </p>
                  {pendingCartItem.product.mediboy_offer_price && (
                    <p style={{ fontSize: '14px', color: '#d97706', marginBottom: '8px' }}>
                      <strong>⚠️ Mediboy Offer Price (Min Required):</strong> ৳
                      {pendingCartItem.product.mediboy_offer_price.toFixed(2)}
                    </p>
                  )}
                  <p style={{ fontSize: '12px', color: '#999', marginBottom: '0px' }}>
                    💡 Hint: Price must be between Mediboy Price & MRP
                  </p>
                </div>

                <label style={{ display: 'block', marginBottom: '16px' }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    Sale Price (BDT)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceModalInput}
                    onChange={(e) => {
                      setPriceModalInput(e.target.value)
                      validatePriceInput(e.target.value)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: priceModalError
                        ? '2px solid #ef4444'
                        : priceModalWarning
                        ? '2px solid #f59e0b'
                        : '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      backgroundColor: priceModalError
                        ? '#fef2f2'
                        : priceModalWarning
                        ? '#fffbf0'
                        : 'white',
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </label>

                {priceModalError && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '4px',
                      color: '#dc2626',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    {priceModalError}
                  </div>
                )}

                {!priceModalError && priceModalWarning && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: '#fffbf0',
                      border: '1px solid #fcd34d',
                      borderRadius: '4px',
                      color: '#d97706',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    {priceModalWarning}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setPriceModalOpen(false)
                      setPendingCartItem(null)
                      setPriceModalError('')
                      setPriceModalInput('')
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#e5e7eb',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePriceConfirm}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="pos-account-section">
            <h1>{netPrice.toFixed(2)}</h1>
            <div className="input-account">
              <input
                type="text"
                placeholder="Contact number"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
              <div className="search-icon">
                <img src={Mobile} alt="" />
              </div>
            </div>
          </div>
        </div>
        <div className="product-description">
          <div className="header-products-table-wrapper">
            <table className="header-products-table">
              <thead>
                <tr>
                  <th>Product Description</th>
                  <th>Company Name</th>
                  <th>MRP</th>
                  <th>In-Stock</th>
                </tr>
              </thead>
              <tbody>
                {selectedProduct ? (
                  <tr>
                    <td>{selectedProduct.product_name}</td>
                    <td>{selectedProduct.company_name}</td>
                    <td>৳{selectedProduct.mrp}</td>
                    <td>{selectedProduct.in_stock ?? 0}</td>
                  </tr>
                ) : (
                  <tr>
                    <td>No product selected</td>
                    <td>No product selected</td>
                    <td>No product selected</td>
                    <td>No product selected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="products-table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product Description</th>
                  <th>Rate</th>
                  <th>QTY</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>
                      No products added
                    </td>
                  </tr>
                ) : (
                  cartItems.map((item, index) => (
                    <tr key={`${item.id}-${index}`}>
                      <td>
                        <div>
                          <strong>{item.product_name}</strong>
                          <p style={{ fontSize: '0.8rem', color: '#666', margin: '2px 0 0 0' }}>
                            {item.company_name}
                          </p>
                          {item.selectedBatch && (
                            <p style={{ fontSize: '0.75rem', color: '#999', margin: '2px 0 0 0' }}>
                              Batch: {item.selectedBatch.batch_no}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>৳{item.salePrice.toFixed(2)}</td>
                      <td>
                        {editingIndex === index ? (
                          <input
                            type="number"
                            min="1"
                            max={item.in_stock ?? 0}
                            value={editingQuantity}
                            onChange={(e) => setEditingQuantity(e.target.value)}
                            onBlur={() => {
                              const newQty = Number.parseInt(editingQuantity, 10)
                              if (!Number.isNaN(newQty)) {
                                handleEditQuantity(index, newQty)
                              }
                              setEditingIndex(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newQty = Number.parseInt(editingQuantity, 10)
                                if (!Number.isNaN(newQty)) {
                                  handleEditQuantity(index, newQty)
                                }
                                setEditingIndex(null)
                              }
                              if (e.key === 'Escape') {
                                setEditingIndex(null)
                              }
                            }}
                            autoFocus
                            className="qty-input-edit"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingIndex(index)
                              setEditingQuantity(item.cartQuantity.toString())
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {item.cartQuantity}
                          </span>
                        )}
                      </td>
                      <td>৳{item.total.toFixed(2)}</td>
                      <td>
                        <button
                          className="remove-button"
                          onClick={() => handleRemoveFromCart(index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {/* bottom section  */}
      <section className="bottom-section">
        <div className="order-section">
          <div className="user-section">
            <div className="user-number-search">
              <input type="search" placeholder="search user by phone number" />
              <div className="user-search-icon">
                <img src={Search} alt="" />
              </div>
            </div>
            <div className="user-button">
              <button className="user-exit-section">
                <img src="src/assets/user-exit.svg" alt="" />
                <span>User Exit</span>
              </button>
              <button className="not-exit-section">
                <img src="src/assets/not-exit.svg" alt="" />
                <span>Not Exit</span>
              </button>
            </div>
          </div>
          <div className="input-order">
            <div className="input-order-bill">
              <div className="input-order-section">
                <div className="formSearch">
                  <div className="searchIcon">
                    <img src={Search} alt="search" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by order number..."
                    value={orderSearchTerm}
                    onChange={(event) => setOrderSearchTerm(event.target.value)}
                    onFocus={handleOrderSearchFocus}
                    onBlur={handleOrderSearchBlur}
                    onKeyDown={handleOrderSearchKeyDown}
                    autoComplete="off"
                  />
                  {isOrderSearchOpen && (
                    <ul className="search-suggestions">
                      {isOrderSearching && orderSearchResults.length === 0 && (
                        <li className="search-suggestion loading">searching...</li>
                      )}
                      {!isOrderSearching && orderSearchResults.length === 0 && (
                        <li className="search-suggestion empty">no orders found</li>
                      )}
                      {orderSearchResults.map((order: any) => {
                        return (
                          <li
                            key={order.id}
                            className="search-suggestion"
                            onMouseDown={(event) => {
                              event.preventDefault()
                              selectOrder(order)
                            }}
                          >
                            <div className="search-suggestion-main">
                              <span className="search-suggestion-name">{order.order_number}</span>
                            </div>
                            <div className="search-suggestion-details">
                              <span className="search-suggestion-company">
                                {order.customer_name}
                              </span>
                              <span className="search-suggestion-price">৳{order.total_amount}</span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <button className="input-order-button" disabled>
                  Return Confirm
                </button>
              </div>

              {/* === Bottom Info Bar === */}
              <div className="bottom-info">
                <div className="return-checkbox">
                  <input type="checkbox" />
                  <label className="return-label">Return</label>
                </div>
                <div className="phone">
                  <img src="src/assets/user-alt.svg" alt="" />
                  <p>
                    {selectedOrder && orderDetails ? (
                      <span>
                        {orderDetails.customer.name} ({orderDetails.customer.phone})
                      </span>
                    ) : (
                      '0123456789'
                    )}
                  </p>
                </div>
                {/* <div className="delivery">
                  <img src="src/assets/vector.svg" alt="" />
                  <p>
                    {selectedOrder && orderDetails
                      ? orderDetails.order_type === 'self_pickup'
                        ? 'Self-Pickup'
                        : 'Home-Delivery'
                      : 'N/A'}
                  </p>
                </div> */}
                <img src="src/assets/vector.svg" alt="" />
                {pickupMethod === 'self_pick' ? (
                  <button
                    onClick={handleOrderSale}
                    disabled={isSalesProcessing || cartItems.length === 0}
                    style={{
                      width: 'fit-content',
                      padding: '3px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: isSalesProcessing ? 'not-allowed' : 'pointer',
                      fontWeight: 400,
                      opacity: isSalesProcessing ? 0.6 : 1,
                    }}
                  >
                    {isSalesProcessing ? 'Processing...' : 'Self-Picked'}
                  </button>
                ) : pickupMethod === 'rider_pick' ? (
                  <button
                    onClick={handleOrderSale}
                    disabled={isSalesProcessing || cartItems.length === 0}
                    style={{
                      width: 'fit-content',
                      padding: '3px',
                      backgroundColor: '#0ea5e9',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: isSalesProcessing ? 'not-allowed' : 'pointer',
                      fontWeight: 400,
                      opacity: isSalesProcessing ? 0.6 : 1,
                    }}
                  >
                    {isSalesProcessing ? 'Processing...' : 'Rider-Picked'}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="bill-section">
              <span>
                {selectedOrder && orderDetails ? orderDetails.offer_total_amount : '000000'}
              </span>
            </div>
          </div>

          {/* === Table Section === */}
          <div className="products-table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product Description</th>
                  <th>Company Name</th>
                  <th>Rate</th>
                  <th>QTY</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {!selectedOrder || !orderDetails ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>
                      No order selected
                    </td>
                  </tr>
                ) : orderDetails.items && orderDetails.items.length > 0 ? (
                  // Show order items from selected order
                  orderDetails.items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td>{item.product_name}</td>
                      <td>{item.company_name}</td>
                      <td>৳{item.max_retail_price}</td>
                      <td>{item.quantity}</td>
                      <td>৳{(item.max_retail_price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>
                      No items in selected order
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="border"></p>
          <div className="Order-price">
            <div className="total">
              <span>Total MRP: ৳{grandTotal.toFixed(2)}</span>
              <span>Total Discount: ৳{grandDiscountTotal.toFixed(2)}</span>
              <span>Net Price: ৳{netPrice.toFixed(2)}</span>
            </div>
            <button
              className="sold-out-btn"
              onClick={handleSoldOut}
              disabled={isSalesProcessing || cartItems.length === 0}
              style={{
                cursor: isSalesProcessing ? 'not-allowed' : 'pointer',
                opacity: isSalesProcessing ? 0.6 : 1,
              }}
            >
              {isSalesProcessing ? 'Processing...' : 'SOLD OUT'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

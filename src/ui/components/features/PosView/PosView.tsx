import React, { useCallback, useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import Search from '../../../assets/search.svg'
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
}

interface CartItem extends Product {
  cartQuantity: number
  total: number
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
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([])
  const searchDebounceRef = useRef<number | undefined>(undefined)
  const searchCloseTimeoutRef = useRef<number | undefined>(undefined)

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

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSearchTerm(product.product_name ?? '')
    setQuantityInput('')
    closeSuggestions()
  }

  const handleAddToCart = () => {
    if (!selectedProduct) {
      Swal.fire({
        icon: 'error',
        title: 'No Product Selected',
        text: 'Please select a product before adding to the cart.',
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

    const newItem: CartItem = {
      ...selectedProduct,
      cartQuantity: qty,
      total: qty * (selectedProduct.mrp ?? 0),
    }
    setCartItems([...cartItems, newItem])

    setQuantityInput('')
    setSelectedProduct(null)
    setSearchTerm('')
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
    updatedCart[index].total = newQty * (item.mrp ?? 0)
    setCartItems(updatedCart)
    setEditingIndex(null)
  }

  const handleOrderSearch = async () => {
    try {
      const orders = await window.electron.searchOrder(orderSearchTerm)
      setOrderDetails(orders)
    } catch (error) {
      console.error('Order search failed:', error)
      Swal.fire({
        icon: 'error',
        title: 'Search Failed',
        text: 'Unable to fetch order details. Please try again.',
      })
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

  const calculateTotals = () => {
    const total = cartItems.reduce((sum, item) => sum + item.total, 0)
    const discount = total * 0.1 // Assuming a 10% discount
    const net = total - discount
    return { total, discount, net }
  }

  const { total, discount, net } = calculateTotals()

  return (
    <main>
      <section className="pos-header">
        <div className="select-batch-bar">
          <h2>BTC</h2>
          <input type="search" placeholder="select batch  " />
          <h2>ADD</h2>
        </div>
        <div className="price-bar">
          <h1>$</h1>
          <input type="number" />
          <h2>10%</h2>
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
          <div className="pos-account-section">
            <h1>{net.toFixed(2)}</h1>
            <div className="input-account">
              <input type="text" placeholder="Contact number for retarget-sale" />
              <div className="search-icon">
                <img src={Search} alt="" />
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
                        </div>
                      </td>
                      <td>৳{item.mrp}</td>
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
                <div className="product-order-search">
                  <input
                    type="search"
                    placeholder="Order Number ?"
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleOrderSearch()
                      }
                    }}
                  />
                  <div className="search-icon">
                    <img src={Search} alt="search" />
                  </div>
                </div>
                <button className="input-order-button">Return Confirm</button>
              </div>

              {/* === Bottom Info Bar === */}
              <div className="bottom-info">
                <div className="return-checkbox">
                  <input type="checkbox" />
                  <label className="return-label">Return</label>
                </div>
                <div className="phone">
                  <img src="src/assets/user-alt.svg" alt="" />
                  <p>01616815056</p>
                </div>
                <div className="delivery">
                  <img src="src/assets/vector.svg" alt="" />
                  <p>Home-Delivery</p>
                </div>
              </div>
            </div>
            <div className="bill-section">
              <span>1025</span>
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
                {orderDetails.length === 0 ? (
                  <tr>
                    <td>No product selected</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                ) : (
                  orderDetails.map((order, index) => (
                    <tr key={index}>
                      <td>{order.productDescription}</td>
                      <td>{order.companyName}</td>
                      <td>{order.rate}</td>
                      <td>{order.quantity}</td>
                      <td>{order.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="border"></p>
          <div className="Order-price">
            <div className="total">
              <span>Total: ৳{total.toFixed(2)}</span>
              <span>Discount: ৳{discount.toFixed(2)}</span>
              <span>Net: ৳{net.toFixed(2)}</span>
            </div>
            <h2 className="sold-out-btn">SOLD OUT</h2>
          </div>
        </div>
      </section>
    </main>
  )
}

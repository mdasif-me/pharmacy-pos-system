/**
 * useCart Hook
 * Manages shopping cart state and operations
 */

import { useState } from 'react'
import { CartItem, Product } from '../types'

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantityInput, setQuantityInput] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingQuantity, setEditingQuantity] = useState('')

  const addToCart = (product: Product, quantity: number, salePrice: number) => {
    const existingItem = cartItems.find((item) => item.id === product.id)

    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                cartQuantity: item.cartQuantity + quantity,
                total: (item.cartQuantity + quantity) * salePrice,
              }
            : item
        )
      )
    } else {
      setCartItems([
        ...cartItems,
        {
          ...product,
          cartQuantity: quantity,
          total: quantity * salePrice,
          salePrice,
        },
      ])
    }

    setSelectedProduct(null)
    setQuantityInput('')
  }

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index))
  }

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index)
      return
    }

    setCartItems(
      cartItems.map((item, i) =>
        i === index
          ? {
              ...item,
              cartQuantity: newQuantity,
              total: newQuantity * item.salePrice,
            }
          : item
      )
    )
  }

  const clearCart = () => {
    setCartItems([])
    setSelectedProduct(null)
    setQuantityInput('')
    setEditingIndex(null)
    setEditingQuantity('')
  }

  return {
    cartItems,
    setCartItems,
    selectedProduct,
    setSelectedProduct,
    quantityInput,
    setQuantityInput,
    editingIndex,
    setEditingIndex,
    editingQuantity,
    setEditingQuantity,
    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
  }
}

// SearchBox component - reusable search input with autocomplete

import React, { useEffect, useRef, useState } from 'react'
import './SearchBox.css'

export interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
  isLoading?: boolean
  debounceMs?: number
  fullWidth?: boolean
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  suggestions = [],
  onSuggestionClick,
  isLoading = false,
  debounceMs = 300,
  fullWidth = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setShowSuggestions(true)

    // Debounce search
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    if (onSearch && debounceMs > 0) {
      const timer = window.setTimeout(() => {
        onSearch(newValue)
      }, debounceMs)
      setDebounceTimer(timer)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(value)
    }
    setShowSuggestions(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    if (onSuggestionClick) {
      onSuggestionClick(suggestion)
    } else if (onSearch) {
      onSearch(suggestion)
    }
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const classes = ['search-box-wrapper', fullWidth && 'search-box-full-width']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="search-box-form">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-box-input"
        />
        <button type="submit" className="search-box-button" disabled={isLoading}>
          {isLoading ? '⏳' : '🔍'}
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="search-box-suggestions">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="search-box-suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

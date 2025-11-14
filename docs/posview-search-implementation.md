# PosView Product Search Implementation

## Overview

Added interactive product search with suggestions dropdown to the PosView component. When users click on the "Search product..." field, they can now see real-time product suggestions as they type.

## Changes Made

### 1. PosView Component (`src/ui/components/features/PosView/PosView.tsx`)

#### State Management

- Added `searchTerm` state to track user input
- Added `isSearchOpen` state to control suggestion dropdown visibility
- Added `isSearching` state for loading indicator
- Added `suggestions` state to store search results
- Added `selectedProduct` state to store the selected product

#### Event Handlers

- `handleSearchFocus()` - Opens suggestion dropdown on input focus
- `handleSearchBlur()` - Closes dropdown after 150ms delay to allow click interaction
- `handleSearchKeyDown()` - Closes dropdown on Escape key press
- `closeSuggestions()` - Utility function to cleanup and close suggestions
- `handleSelectProduct()` - Handles product selection from dropdown

#### Search Functionality

- Debounced search with 250ms delay to reduce API calls
- Fetches products from `window.electron.searchProducts()`
- Shows loading state while searching
- Shows "no products found" message when search returns empty results
- Displays suggestions with:
  - Product type (abbreviated to 3 characters)
  - Product name
  - Quantity (if available)
  - In-stock value (including 0)
  - Company name
  - MRP price

#### UI Structure

```jsx
<div className="product-search" style={{ position: 'relative' }}>
  <input
    type="search"
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
    onFocus={handleSearchFocus}
    onBlur={handleSearchBlur}
    onKeyDown={handleSearchKeyDown}
  />
  {isSearchOpen && <ul className="search-suggestions-pos">{/* Suggestion items */}</ul>}
</div>
```

### 2. PosView Styles (`src/ui/components/features/PosView/PosView.css`)

#### New CSS Classes

**`.search-suggestions-pos`**

- Absolute positioned dropdown below input
- Max height 300px with scrollbar
- White background with border and shadow
- Z-index 100 for layering

**`.search-suggestion-item`**

- Individual suggestion list item
- Hover effect with light gray background
- Flex layout for main and details rows

**`.suggestion-main`**

- Contains product type, name, quantity, and stock
- Flexible layout that wraps on smaller screens

**`.suggestion-type`**

- Bold, 0.9rem font
- Dark color (#333)

**`.suggestion-name`**

- Bold, 0.9rem font
- Flex-1 to take available space

**`.suggestion-quantity`**

- Small font (0.75rem)
- Gray color (#666)

**`.suggestion-stock`**

- Orange color (#d97706)
- Light yellow background (#fef3c7)
- Highlighted badge style
- Shows "in-stock: {value}" including zero values

**`.suggestion-details`**

- Flexbox with space-between
- Contains company name and price

**`.suggestion-company`**

- Gray color (#555)
- 0.8rem font

**`.suggestion-price`**

- Green color (#16a34a)
- Bold and 0.85rem font
- Shows currency symbol (৳)

## Key Features

✅ **Real-time Search** - Products appear as user types  
✅ **Debounced Requests** - 250ms delay prevents excessive API calls  
✅ **Stock Display** - Shows in-stock value including 0  
✅ **Product Details** - Type, name, quantity, company, price  
✅ **Loading State** - Shows "searching..." indicator  
✅ **Empty State** - Shows "no products found" message  
✅ **Keyboard Support** - ESC key closes dropdown  
✅ **Responsive** - Works on all screen sizes

## Product Data Displayed

Each suggestion item displays:

```
[Type]. [Product Name] [Qty]  [in-stock: X]
[Company Name]                              ৳[MRP]
```

Example:

```
Tab. Aspirin 100mg  in-stock: 0
Healthcare Ltd.                          ৳50.00
```

## Related Documentation

- See `docs/offline-stock-implementation.md` for stock management details
- See `docs/socket-integration.md` for real-time data sync

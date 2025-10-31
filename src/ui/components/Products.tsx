import React, { useEffect, useRef, useState } from 'react';
import './Products.css';

interface ProductsProps {
  user: AuthToken;
  onLogout: () => void;
}

export const Products: React.FC<ProductsProps> = ({ user, onLogout }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [companies, setCompanies] = useState<Array<{company_id: number, company_name: string}>>([]);
  const [types, setTypes] = useState<Array<{type: string}>>([]);
  const [categories, setCategories] = useState<Array<{category_id: number, category_name: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [peakHourInput, setPeakHourInput] = useState('');
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const hasLoadedRef = useRef(false);

  // load products and filter data on component mount
  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;
    loadInitialData();
  }, []);

  // apply filters when search or filter values change
  useEffect(() => {
    applyFilters();
  }, [products, searchTerm, selectedCompany, selectedType, selectedCategory]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // load products from local database first
      const localProducts = await window.electron.getAllProducts();
      setProducts(localProducts ?? []);

      // load filter options
      const [companiesData, typesData, categoriesData] = await Promise.all([
        window.electron.getUniqueCompanies(),
        window.electron.getUniqueTypes(),
        window.electron.getUniqueCategories(),
      ]);

      setCompanies(companiesData ?? []);
      setTypes(typesData ?? []);
      setCategories(categoriesData ?? []);

      // if no local products, sync from api
      if (localProducts.length === 0) {
        await syncProducts();
      }
    } catch (error) {
      console.error('failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncProducts = async () => {
    try {
      setIsSyncing(true);

      // fetch latest products from api and store locally
      const apiProducts = await window.electron.syncProducts();
      setProducts(apiProducts ?? []);

      // refresh filter options after sync
      const [companiesData, typesData, categoriesData] = await Promise.all([
        window.electron.getUniqueCompanies(),
        window.electron.getUniqueTypes(),
        window.electron.getUniqueCategories(),
      ]);

      setCompanies(companiesData ?? []);
      setTypes(typesData ?? []);
      setCategories(categoriesData ?? []);
      setLastSync(new Date().toLocaleString());

    } catch (error) {
      console.error('sync failed:', error);
      const message = error instanceof Error ? error.message : 'failed to sync products from server';
      alert(`failed to sync products: ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // search filter - check product name and generic name
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        (product.productName ?? '').toLowerCase().includes(term) ||
        (product.genericName ?? '').toLowerCase().includes(term)
      );
    }

    // company filter
    if (selectedCompany) {
      filtered = filtered.filter(product => 
        product.company_id === selectedCompany
      );
    }

    // type filter
    if (selectedType) {
      filtered = filtered.filter(product => 
        product.type === selectedType
      );
    }

    // category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category_id === selectedCategory
      );
    }

    setFilteredProducts(filtered);
  };

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) {
      return '—';
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return '—';
    }

    return `৳${numeric.toFixed(2)}`;
  };

  const openPriceModal = (product: Product) => {
    setSelectedProduct(product);
    setDiscountInput(
      product.discount_price !== null && product.discount_price !== undefined
        ? product.discount_price.toString()
        : ''
    );
    setPeakHourInput(
      product.peak_hour_price !== null && product.peak_hour_price !== undefined
        ? product.peak_hour_price.toString()
        : ''
    );
    setIsModalOpen(true);
  };

  const closePriceModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setDiscountInput('');
    setPeakHourInput('');
  };

  const parsePriceInput = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }

    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      return undefined;
    }

    return parsed;
  };

  const handlePriceUpdate = async () => {
    if (!selectedProduct) {
      return;
    }

    const discountPrice = parsePriceInput(discountInput);
    if (discountPrice === undefined) {
      alert('enter a valid discount price');
      return;
    }

    const peakHourPrice = parsePriceInput(peakHourInput);
    if (peakHourPrice === undefined) {
      alert('enter a valid peak-hour price');
      return;
    }

    if (discountPrice <= 0 || peakHourPrice <= 0) {
      alert('prices must be greater than zero');
      return;
    }

    const offerPrice = selectedProduct.mediboy_offer_price;
    if (
      offerPrice !== null &&
      offerPrice !== undefined &&
      (discountPrice <= offerPrice || peakHourPrice <= offerPrice)
    ) {
      alert('discount and peak-hour prices must be greater than the Mediboy offer price');
      return;
    }

    setIsSavingPrices(true);
    try {
      const updatedProduct = await window.electron.updateProductPrices(
        selectedProduct.id,
        {
          discount_price: discountPrice,
          peak_hour_price: peakHourPrice,
        }
      );

      if (updatedProduct) {
        setProducts(prevProducts =>
          prevProducts.map(product =>
            product.id === updatedProduct.id ? { ...product, ...updatedProduct } : product
          )
        );
      }

      closePriceModal();
    } catch (error) {
      console.error('failed to update prices:', error);
      const message = error instanceof Error ? error.message : 'failed to update prices';
      alert(message);
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleLogout = async () => {
    const shouldLogout = window.confirm('Are you sure you want to logout?');
    if (!shouldLogout) {
      return;
    }
    try {
      await window.electron.logout();
      onLogout();
    } catch (error) {
      console.error('logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>loading products...</p>
      </div>
    );
  }

  return (
    <div className="products-container">
      {/* header */}
      <div className="header">
        <div className="header-left">
          <h1>pharmacy products</h1>
          <p>welcome, {user.user_name}</p>
          {lastSync && <p className="last-sync">last sync: {lastSync}</p>}
        </div>
        <div className="header-right">
          <button 
            onClick={syncProducts} 
            disabled={isSyncing}
            className="sync-button"
          >
            {isSyncing ? 'syncing...' : 'sync products'}
          </button>
          <button onClick={handleLogout} className="logout-button">
            logout
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value ? Number(e.target.value) : '')}
            className="filter-select"
          >
            <option value="">all companies</option>
            {companies.map(company => (
              <option key={company.company_id} value={company.company_id}>
                {company.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="filter-select"
          >
            <option value="">all types</option>
            {types.map(type => (
              <option key={type.type} value={type.type}>
                {type.type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
            className="filter-select"
          >
            <option value="">all categories</option>
            {categories.map(category => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name || `Category ${category.category_id}`}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-info">
          showing {filteredProducts.length} of {products.length} products
        </div>
      </div>

      <div className="products-table-wrapper">
        {filteredProducts.length > 0 ? (
          <table className="products-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Type</th>
                <th>MRP/UNIT</th>
                <th>Rate/UNIT</th>
                <th>Company Name</th>
                <th>Current Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const categoryLabel =
                  product.category_name ||
                  (product.category_id ? `Category ${product.category_id}` : '');

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name-cell">
                        <span className="product-name">{product.productName}</span>
                        {product.genericName && (
                          <span className="product-generic">{product.genericName}</span>
                        )}
                        {categoryLabel && (
                          <span className="product-category">{categoryLabel}</span>
                        )}
                      </div>
                    </td>
                    <td>{product.type || '—'}</td>
                    <td>{formatCurrency(product.retail_max_price)}</td>
                    <td>
                      {formatCurrency(
                        product.discount_price ?? product.peak_hour_price ?? product.sale_price
                      )}
                    </td>
                    <td>{product.company_name || '—'}</td>
                    <td>{product.in_stock ?? 0}</td>
                    <td>
                      <button
                        className="edit-button"
                        onClick={() => openPriceModal(product)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="no-products">
            <p>no products found</p>
            {products.length === 0 && (
              <button onClick={syncProducts} className="sync-button">
                sync products from server
              </button>
            )}
          </div>
        )}
      </div>

      {isModalOpen && selectedProduct && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget && !isSavingPrices) {
              closePriceModal();
            }
          }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>Update Price</h2>
              <p className="modal-subtitle">{selectedProduct.productName}</p>
            </div>
            <div className="modal-body">
              <p className="modal-offer">
                Mediboy offer price:{' '}
                <strong>{formatCurrency(selectedProduct.mediboy_offer_price)}</strong>
              </p>
              <label className="modal-label">
                Discount Price/Unit (BDT)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="leave empty to clear"
                />
              </label>
              <label className="modal-label">
                Peak-Hour Price/Unit (BDT)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={peakHourInput}
                  onChange={(e) => setPeakHourInput(e.target.value)}
                  placeholder="leave empty to clear"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="modal-close"
                onClick={closePriceModal}
                disabled={isSavingPrices}
              >
                Close
              </button>
              <button
                className="modal-update"
                onClick={handlePriceUpdate}
                disabled={isSavingPrices}
              >
                {isSavingPrices ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
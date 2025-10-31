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

  const updateStock = async (productId: number, newStock: number) => {
    try {
      await window.electron.updateProductStock(productId, newStock);
      
      // update local state
      setProducts(prevProducts => 
        prevProducts.map(product =>
          product.id === productId 
            ? { ...product, in_stock: newStock }
            : product
        )
      );
      
    } catch (error) {
      console.error('failed to update stock:', error);
      alert('failed to update stock');
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

      {/* products grid */}
      <div className="products-grid">
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onUpdateStock={updateStock}
          />
        ))}
        
        {filteredProducts.length === 0 && (
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
    </div>
  );
};

// individual product card component
interface ProductCardProps {
  product: Product;
  onUpdateStock: (productId: number, newStock: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onUpdateStock }) => {
  const [stockInput, setStockInput] = useState(product.in_stock?.toString() || '0');
  const categoryLabel = product.category_name || (product.category_id ? `Category ${product.category_id}` : '');

  const handleStockUpdate = () => {
    const newStock = parseInt(stockInput);
    if (!isNaN(newStock) && newStock >= 0) {
      onUpdateStock(product.id, newStock);
    }
  };

  return (
    <div className="product-card">
      <div className="product-header">
        <h3>{product.productName}</h3>
        <span className="product-id">#{product.id}</span>
      </div>
      
      <div className="product-info">
        <p><strong>generic:</strong> {product.genericName}</p>
        <p><strong>company:</strong> {product.company_name}</p>
        <p><strong>type:</strong> {product.type}</p>
        {categoryLabel && (
          <p><strong>category:</strong> {categoryLabel}</p>
        )}
        <p><strong>pack size:</strong> {product.unit_in_pack}</p>
      </div>

      <div className="product-pricing">
        <div className="price-row">
          <span>retail price:</span>
          <span>৳{product.retail_max_price}</span>
        </div>
        {product.discount_price && (
          <div className="price-row discount">
            <span>discount price:</span>
            <span>৳{product.discount_price}</span>
          </div>
        )}
      </div>

      <div className="stock-section">
        <div className="stock-info">
          <span>current stock: {product.in_stock || 0}</span>
        </div>
        <div className="stock-update">
          <input
            type="number"
            value={stockInput}
            onChange={(e) => setStockInput(e.target.value)}
            min="0"
            className="stock-input"
          />
          <button onClick={handleStockUpdate} className="update-button">
            update
          </button>
        </div>
      </div>

      {product.prescription === 'yes' && (
        <div className="prescription-badge">
          prescription required
        </div>
      )}
    </div>
  );
};
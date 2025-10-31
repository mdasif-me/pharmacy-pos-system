// product table for storing all product info from api
export const createProductsTable = `
	CREATE TABLE IF NOT EXISTS products (
		id INTEGER PRIMARY KEY,
		productName TEXT,
		genericName TEXT,
		retail_max_price REAL,
		cart_qty_inc INTEGER,
		cart_text TEXT,
		unit_in_pack TEXT,
		type TEXT,
		quantity TEXT,
		prescription TEXT,
		feature TEXT,
		company_id INTEGER,
		company_name TEXT,
		category_id INTEGER,
		category_name TEXT,
		in_stock INTEGER,
		discount_price REAL,
		peak_hour_price REAL,
		mediboy_offer_price REAL,
		sale_price REAL,
		status TEXT,
		cover_image TEXT,
		last_sync_at TEXT
	);
`;

// auth tokens and user info table
export const createAuthTokensTable = `
	CREATE TABLE IF NOT EXISTS auth_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT,
		user_id INTEGER,
		user_name TEXT,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	);
`;

// sync status table for tracking last sync
export const createSyncStatusTable = `
	CREATE TABLE IF NOT EXISTS sync_status (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		last_product_sync TEXT
	);
`;

// make stock_products, stocks, mfg_data nullable in their respective tables
// if these tables exist, alter them; otherwise, create with nullable fields
export const alterStockProductsNullable = `
	-- this is a placeholder, run ALTER TABLE if needed
`;

export const alterStocksNullable = `
	-- this is a placeholder, run ALTER TABLE if needed
`;

export const alterMfgDataNullable = `
	-- this is a placeholder, run ALTER TABLE if needed
`;

// pharmacy_business_setups table with new fields
export const createPharmacyBusinessSetupsTable = `
	CREATE TABLE IF NOT EXISTS pharmacy_business_setups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		-- ...other fields...
		bill_mode INTEGER DEFAULT 0, -- 0 = discount, 1 = peak hour
		sale_mode INTEGER DEFAULT 0  -- 0 = discount, 1 = peak hour
	);
`;

export const alterProductsTableStatements = [
	"ALTER TABLE products ADD COLUMN category_id INTEGER",
	"ALTER TABLE products ADD COLUMN category_name TEXT",
	"ALTER TABLE products ADD COLUMN sale_price REAL",
	"ALTER TABLE products ADD COLUMN status TEXT",
	"ALTER TABLE products ADD COLUMN cover_image TEXT"
];

// indices for performance (add as needed)
export const createIndices = [
	// 'CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);',
];

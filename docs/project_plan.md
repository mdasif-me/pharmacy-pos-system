# Pharmacy POS - Refactoring Plan

## 🎯 Project Architecture Goals

### Core Principles

1. **Offline-First Architecture** - Full functionality without internet
2. **Data Synchronization** - Smart merge strategy for online/offline data
3. **Performance Optimization** - Fast search, indexing, and caching
4. **Scalability** - Easy to extend and maintain
5. **Developer Experience** - Clean, well-organized code structure

---

## 📁 New Folder Structure

```
src/
├── electron/
│   ├── core/
│   │   ├── config/
│   │   │   ├── app.config.ts           # App-wide configuration
│   │   │   ├── database.config.ts      # Database configuration
│   │   │   └── api.config.ts           # API endpoints configuration
│   │   ├── constants/
│   │   │   ├── errors.constants.ts     # Error messages and codes
│   │   │   ├── database.constants.ts   # Database table names, limits
│   │   │   └── app.constants.ts        # App-wide constants
│   │   └── enums/
│   │       ├── sync-status.enum.ts     # Sync states
│   │       ├── price-mode.enum.ts      # Discount/Peak hour modes
│   │       └── entity-status.enum.ts   # Active/Inactive/Deleted
│   │
│   ├── database/
│   │   ├── core/
│   │   │   ├── connection.manager.ts   # Database connection pool
│   │   │   ├── migration.manager.ts    # Schema migrations
│   │   │   └── query.builder.ts        # Query builder utility
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.ts
│   │   │   ├── 002_add_indexes.ts
│   │   │   └── migration.registry.ts
│   │   ├── models/
│   │   │   ├── product.model.ts
│   │   │   ├── auth.model.ts
│   │   │   └── sync.model.ts
│   │   ├── repositories/
│   │   │   ├── base.repository.ts      # Abstract base repository
│   │   │   ├── product.repository.ts
│   │   │   ├── auth.repository.ts
│   │   │   └── sync.repository.ts
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── http.client.ts          # Axios wrapper with retry logic
│   │   │   ├── auth.api.service.ts
│   │   │   ├── product.api.service.ts
│   │   │   └── index.ts
│   │   ├── sync/
│   │   │   ├── sync.strategy.ts        # Sync strategies interface
│   │   │   ├── product.sync.service.ts
│   │   │   ├── conflict-resolver.ts    # Handle data conflicts
│   │   │   └── queue.manager.ts        # Offline action queue
│   │   ├── cache/
│   │   │   ├── memory.cache.ts         # In-memory cache
│   │   │   └── cache.service.ts
│   │   └── search/
│   │       ├── search.service.ts       # Full-text search
│   │       └── search.indexer.ts       # Search index builder
│   │
│   ├── types/
│   │   ├── entities/
│   │   │   ├── product.types.ts
│   │   │   ├── auth.types.ts
│   │   │   └── sync.types.ts
│   │   ├── api/
│   │   │   ├── requests.types.ts
│   │   │   └── responses.types.ts
│   │   ├── database/
│   │   │   └── models.types.ts
│   │   └── ipc/
│   │       └── channels.types.ts
│   │
│   ├── utils/
│   │   ├── validation/
│   │   │   ├── validator.ts
│   │   │   └── schemas.ts
│   │   ├── logger/
│   │   │   └── logger.ts
│   │   └── helpers/
│   │       ├── date.helper.ts
│   │       ├── string.helper.ts
│   │       └── number.helper.ts
│   │
│   ├── ipc/
│   │   ├── handlers/
│   │   │   ├── auth.handler.ts
│   │   │   ├── product.handler.ts
│   │   │   └── sync.handler.ts
│   │   ├── channels.ts                 # IPC channel definitions
│   │   └── register.ts                 # Register all handlers
│   │
│   ├── main.ts                         # Main process entry
│   ├── preload.ts                      # Preload script
│   └── tsconfig.json
│
├── ui/
│   ├── components/
│   │   ├── common/                     # Reusable components
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── SearchBox/
│   │   │   └── Table/
│   │   ├── features/                   # Feature-specific components
│   │   │   ├── Auth/
│   │   │   ├── Products/
│   │   │   ├── AddStock/
│   │   │   └── Dashboard/
│   │   └── layouts/
│   │       ├── MainLayout/
│   │       └── AuthLayout/
│   │
│   ├── hooks/
│   │   ├── useProducts.ts
│   │   ├── useSync.ts
│   │   ├── useSearch.ts
│   │   └── useAuth.ts
│   │
│   ├── services/
│   │   ├── electron.service.ts         # IPC wrapper
│   │   └── broadcast.service.ts
│   │
│   ├── store/                          # State management
│   │   ├── slices/
│   │   │   ├── auth.slice.ts
│   │   │   ├── products.slice.ts
│   │   │   └── sync.slice.ts
│   │   └── store.ts
│   │
│   ├── types/
│   │   ├── components.types.ts
│   │   └── props.types.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── validators.ts
│   │
│   ├── styles/
│   │   ├── theme/
│   │   │   ├── colors.css
│   │   │   ├── spacing.css
│   │   │   └── typography.css
│   │   ├── components/
│   │   └── global.css
│   │
│   └── main.tsx
│
└── shared/                             # Shared between electron & ui
    ├── types/
    │   └── common.types.ts
    ├── constants/
    │   └── app.constants.ts
    └── utils/
        └── common.utils.ts
```

---

## 🗄️ Database Architecture

### Enhanced Schema Design

#### 1. Products Table (Optimized)

```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    product_name TEXT NOT NULL,
    generic_name TEXT,
    company_id INTEGER NOT NULL,
    category_id INTEGER,

    -- Pricing
    mrp REAL NOT NULL,
    sale_price REAL,
    discount_price REAL,
    peak_hour_price REAL,
    mediboy_offer_price REAL,

    -- Stock
    in_stock INTEGER DEFAULT 0,
    stock_alert INTEGER DEFAULT 10,

    -- Metadata
    type TEXT,
    prescription INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',

    -- Images
    cover_image TEXT,
    image_path TEXT,

    -- Sync tracking
    version INTEGER DEFAULT 1,
    last_synced_at TEXT,
    last_modified_at TEXT,
    is_dirty INTEGER DEFAULT 0,      -- Local changes pending sync

    -- Full JSON for extensibility
    raw_data TEXT,

    -- Indexes
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Performance Indexes
CREATE INDEX idx_products_search ON products(product_name, generic_name);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_stock ON products(in_stock);
CREATE INDEX idx_products_dirty ON products(is_dirty);
CREATE INDEX idx_products_sync ON products(last_synced_at);

-- Full-Text Search (FTS5)
CREATE VIRTUAL TABLE products_fts USING fts5(
    product_name,
    generic_name,
    company_name,
    content=products,
    content_rowid=id
);
```

#### 2. Sync Queue (Offline Actions)

```sql
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,        -- 'product', 'stock', etc.
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,             -- 'create', 'update', 'delete'
    payload TEXT NOT NULL,            -- JSON data
    status TEXT DEFAULT 'pending',    -- 'pending', 'processing', 'failed', 'completed'
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    synced_at TEXT
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
```

#### 3. Companies & Categories (Normalized)

```sql
CREATE TABLE companies (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_categories_name ON categories(name);
```

#### 4. Sync Metadata

```sql
CREATE TABLE sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL UNIQUE,
    last_sync_at TEXT,
    last_sync_version INTEGER DEFAULT 0,
    total_synced INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0
);
```

---

## 🔄 Sync Strategy

### Smart Merge Algorithm

```typescript
interface SyncStrategy {
  // 1. Pull latest from server
  async pullFromServer(): Promise<SyncResult>

  // 2. Push local changes
  async pushToServer(): Promise<SyncResult>

  // 3. Resolve conflicts (server wins by default, configurable)
  resolveConflict(local: Entity, remote: Entity): Entity

  // 4. Mark clean records
  markSynced(entityIds: number[]): Promise<void>
}
```

### Conflict Resolution Rules

1. **Last Write Wins** - Timestamp-based
2. **Server Priority** - Server data takes precedence
3. **Manual Resolution** - Queue for user review
4. **Field-Level Merge** - Merge non-conflicting fields

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

- [ ] New folder structure
- [ ] Database migrations system
- [ ] Repository pattern
- [ ] Type definitions

### Phase 2: Database Layer (Week 1-2)

- [ ] Enhanced schema with indexes
- [ ] Full-text search (FTS5)
- [ ] Sync queue system
- [ ] Base repository with CRUD

### Phase 3: Services Layer (Week 2)

- [ ] Product repository & service
- [ ] Sync service with queue
- [ ] Cache service
- [ ] Search service

### Phase 4: UI Refactoring (Week 3)

- [ ] Component library (common)
- [ ] Feature components
- [ ] Custom hooks
- [ ] State management

### Phase 5: Sync Implementation (Week 3-4)

- [ ] Offline queue
- [ ] Background sync
- [ ] Conflict resolution
- [ ] Progress indicators

### Phase 6: Performance & Polish (Week 4)

- [ ] Query optimization
- [ ] Virtual scrolling
- [ ] Lazy loading
- [ ] Error boundaries

---

## 📊 Performance Optimizations

### Database Level

1. **Indexes** - Strategic indexes on search/filter columns
2. **FTS5** - Full-text search for instant results
3. **Connection Pool** - Reuse connections
4. **Prepared Statements** - Query caching
5. **Batch Operations** - Bulk inserts/updates

### Application Level

1. **Memory Cache** - Hot data in RAM
2. **Virtual Scrolling** - Large lists
3. **Debounced Search** - Reduce queries
4. **Lazy Loading** - Load on demand
5. **Web Workers** - Heavy operations

### Sync Optimization

1. **Delta Sync** - Only changed records
2. **Chunked Transfer** - Large datasets
3. **Background Sync** - Non-blocking
4. **Smart Retry** - Exponential backoff
5. **Compression** - Reduce bandwidth

---

## 🧪 Testing Strategy

```
tests/
├── unit/
│   ├── database/
│   ├── services/
│   └── utils/
├── integration/
│   ├── sync/
│   └── api/
└── e2e/
    └── user-flows/
```

---

## 📝 Migration Steps

1. **Backup Current Database**
2. **Create New Schema** (run migrations)
3. **Migrate Data** (from old to new structure)
4. **Refactor Services** (one by one)
5. **Update UI Components** (feature by feature)
6. **Test Thoroughly**
7. **Deploy Gradually**

---

## 🎓 Best Practices Applied

✅ **SOLID Principles**
✅ **Repository Pattern**
✅ **Service Layer**
✅ **Dependency Injection**
✅ **Type Safety**
✅ **Error Handling**
✅ **Logging**
✅ **Testing**

---

This refactoring will create a **production-ready**, **scalable**, and **maintainable** codebase that supports true offline-first functionality with intelligent synchronization.

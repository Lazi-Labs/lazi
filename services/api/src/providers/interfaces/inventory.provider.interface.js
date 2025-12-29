/**
 * Inventory Provider Interface
 * Maps to: /inventory/v2/tenant/{tenant}/*
 */

/**
 * @typedef {Object} InventoryItem
 * @property {string} id
 * @property {string} tenantId
 * @property {string} name
 * @property {string} [sku]
 * @property {string} [description]
 * @property {number} quantityOnHand
 * @property {number} [reorderPoint]
 * @property {number} [reorderQuantity]
 * @property {number} unitCost
 * @property {string} [warehouseId]
 * @property {string} [vendorId]
 * @property {boolean} active
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} Warehouse
 * @property {string} id
 * @property {string} tenantId
 * @property {string} name
 * @property {Object} [address]
 * @property {boolean} active
 */

/**
 * @typedef {Object} PurchaseOrder
 * @property {string} id
 * @property {string} tenantId
 * @property {string} poNumber
 * @property {string} vendorId
 * @property {string} status - 'Draft'|'Submitted'|'Received'|'Canceled'
 * @property {Object[]} items
 * @property {number} total
 * @property {Date} orderDate
 * @property {Date} [expectedDate]
 */

/**
 * @typedef {Object} IInventoryProvider
 * @property {function(string, string): Promise<InventoryItem|null>} getItemById
 * @property {function(string, Object): Promise<InventoryItem[]>} listItems
 * @property {function(string, string): Promise<InventoryItem[]>} listByWarehouse
 * @property {function(string, Partial<InventoryItem>): Promise<InventoryItem>} updateQuantity
 * @property {function(string): Promise<Warehouse[]>} listWarehouses
 * @property {function(string, string): Promise<Warehouse|null>} getWarehouseById
 * @property {function(string, Object): Promise<PurchaseOrder[]>} listPurchaseOrders
 * @property {function(string, string): Promise<PurchaseOrder|null>} getPurchaseOrderById
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};

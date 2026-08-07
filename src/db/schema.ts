import { pgTable, text, integer, serial, timestamp, doublePrecision, jsonb } from 'drizzle-orm/pg-core';

// Users table for Firebase Auth
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Warehouses table
export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  groupName: text('group_name'),
  subGroup: text('sub_group'),
  description: text('description'),
  manager: text('manager'),
  location: text('location'),
  parentId: text('parent_id'),
  warehouseType: text('warehouse_type'),
});

// Item Groups
export const itemGroups = pgTable('item_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

// Items table
export const items = pgTable('items', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  barcode: text('barcode'),
  groupName: text('group_name'),
  subGroup: text('sub_group'),
  unit: text('unit').notNull(),
  minStock: integer('min_stock').default(0),
  maxStock: integer('max_stock').default(1000),
  unitPrice: doublePrecision('unit_price').default(0),
  itemType: text('item_type').default('RawMaterial'),
  locationInRack: text('location_in_rack'),
  description: text('description'),
});

// Inventory balances table
export const inventory = pgTable('inventory', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  quantity: doublePrecision('quantity').default(0),
});

// Stock Transfers
export const transfers = pgTable('transfers', {
  id: text('id').primaryKey(),
  transferNumber: text('transfer_number').notNull(),
  date: text('date').notNull(),
  sourceWarehouseId: text('source_warehouse_id').notNull(),
  targetWarehouseId: text('target_warehouse_id').notNull(),
  projectId: text('project_id'),
  status: text('status').default('Pending'),
  createdBy: text('created_by'),
  notes: text('notes'),
  itemsJson: jsonb('items_json'),
});

// Contractors
export const contractors = pgTable('contractors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  address: text('address'),
  activeProjectsCount: integer('active_projects_count').default(0),
});

// BOM (Bill of Materials)
export const boms = pgTable('boms', {
  id: text('id').primaryKey(),
  productName: text('product_name').notNull(),
  version: text('version').notNull(),
  createdAt: text('created_at'),
  itemsJson: jsonb('items_json'),
});

// Purchase Requests
export const purchaseRequests = pgTable('purchase_requests', {
  id: text('id').primaryKey(),
  requestNumber: text('request_number').notNull(),
  date: text('date').notNull(),
  requester: text('requester'),
  projectId: text('project_id'),
  warehouseId: text('warehouse_id'),
  status: text('status').default('Pending'),
  notes: text('notes'),
  itemsJson: jsonb('items_json'),
});

// Stock Counting
export const stockCounts = pgTable('stock_counts', {
  id: text('id').primaryKey(),
  countNumber: text('count_number').notNull(),
  date: text('date').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  status: text('status').default('Draft'),
  counterName: text('counter_name'),
  notes: text('notes'),
  itemsJson: jsonb('items_json'),
});

// Operator Logs
export const operatorLogs = pgTable('operator_logs', {
  id: text('id').primaryKey(),
  logNumber: text('log_number').notNull(),
  date: text('date').notNull(),
  operatorName: text('operator_name'),
  projectId: text('project_id'),
  sourceWarehouseId: text('source_warehouse_id'),
  producedItemName: text('produced_item_name'),
  quantity: doublePrecision('quantity').default(1),
  unit: text('unit').default('عدد'),
  bomId: text('bom_id'),
  status: text('status').default('Confirmed'),
  notes: text('notes'),
});

// Projects
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  projectNumber: text('project_number').notNull(),
  customerName: text('customer_name'),
  projectName: text('project_name').notNull(),
  status: text('status').default('InProduction'),
  targetQuantity: integer('target_quantity').default(0),
  producedQuantity: integer('produced_quantity').default(0),
  deadline: text('deadline'),
  stepsJson: jsonb('steps_json'),
});

// Backups Log Table
export const backups = pgTable('backups', {
  id: serial('id').primaryKey(),
  backupName: text('backup_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  sizeBytes: integer('size_bytes').default(0),
  backupType: text('backup_type').default('AUTOMATIC'),
});

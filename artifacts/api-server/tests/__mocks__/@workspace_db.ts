/**
 * Complete mock for @workspace/db module
 * In-memory replacements for drizzle-orm tables so route tests can run without PostgreSQL.
 */
const inMemoryData: Record<string, Record<number, any>> = {};
let idCounter = 1;

class QueryBuilder {
  private _table: string;
  private _where: Record<string, any> = {};
  private _orderBy: { field: string; dir: 'asc' | 'desc' }[] = [];
  private _limitVal: number | null = null;

  constructor(table: string) { this._table = table; }

  $dynamic() { return this; }

  where(condition: any) {
    if (condition && condition._field && condition._value !== undefined)
      this._where[condition._field] = condition._value;
    else if (condition && condition._field && condition._values)
      this._where[condition._field] = condition;
    return this;
  }

  orderBy(...args: any[]) {
    if (args[0] && typeof args[0] === 'object' && args[0]._field)
      this._orderBy.push({ field: String(args[0]._field), dir: args[0]._dir || 'asc' });
    return this;
  }

  limit(n: number) { this._limitVal = n; return this; }

  private _getData(): any[] {
    let data = Object.values(inMemoryData[this._table] || {});
    for (const [field, value] of Object.entries(this._where))
      data = data.filter(item => value && typeof value === 'object' && value._values
        ? value._values.includes(item[field]) : item[field] === value);
    for (const { field, dir } of this._orderBy)
      data.sort((a, b) => {
        const av = a[field] instanceof Date ? a[field].getTime() : a[field];
        const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
        return dir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
      });
    if (this._limitVal) data = data.slice(0, this._limitVal);
    return data;
  }

  then(resolve: (val: any[]) => void, _reject?: (err: any) => void) {
    try { resolve(this._getData()); } catch (e) { if (_reject) _reject(e); }
  }
  catch(reject: (err: any) => void) { this.then(() => {}, reject); }
  finally(fn: () => void) { this.then(fn, fn); }
  [Symbol.toStringTag] = 'QueryBuilder';
}

// --- Drizzle helpers ---
function toField(fieldOrCol: string | { name?: string }): string {
  return typeof fieldOrCol === 'string' ? fieldOrCol : (fieldOrCol.name ?? '');
}
function mockEq(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: 'eq' };
}
function mockDesc(field: string | { name?: string }) {
  return { _field: toField(field), _dir: 'desc' as const };
}
function mockAsc(field: string | { name?: string }) {
  return { _field: toField(field), _dir: 'asc' as const };
}
function mockCount() {
  return { _field: 'count(*)', operator: 'count' };
}
function mockInArray(field: string | { name?: string }, values: any[]) {
  return { _field: toField(field), _values: values, operator: 'in' };
}
function mockGte(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: 'gte' };
}
function mockLt(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: 'lt' };
}
function mockAnd(...conditions: any[]) {
  return { _and: conditions, operator: 'and' };
}
function mockSql(strings: TemplateStringsArray, ...values: any[]) {
  return { _sql: strings.join('?'), _values: values };
}

// --- Table definitions with dynamic field access ---
function makeTable(name: string) {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === '_table') return name;
      if (prop === '$inferSelect' || prop === '$inferInsert') return {};
      if (typeof prop === 'symbol') return undefined;
      return { name: String(prop) };
    },
  });
}

const productsTable = makeTable('products');
const suppliersTable = makeTable('suppliers');
const ordersTable = makeTable('orders');
const researchTable = makeTable('research');
const supplierFinderTable = makeTable('supplier_finder');
const priceWatchTable = makeTable('price_watch');
const priceSnapshotsTable = makeTable('price_snapshots');
const purchaseOrdersTable = makeTable('purchase_orders');
const purchaseOrderItemsTable = makeTable('purchase_order_items');
const returnsTable = makeTable('returns');
const orderTimelineTable = makeTable('order_timeline');
const promotionsTable = makeTable('promotions');
const productTagsTable = makeTable('product_tags');
const productTagLinksTable = makeTable('product_tag_links');
const launchesTable = makeTable('launches');
const adCampaignsTable = makeTable('ad_campaigns');
const storeConnectionsTable = makeTable('store_connections');
const syncLogsTable = makeTable('sync_logs');
const aiSettingsTable = makeTable('ai_settings');
const fulfillmentQueueTable = makeTable('fulfillment_queue');

// Wraps numeric string fields back to numbers on select
function normalizeRow(r: any) {
  if (!r) return r;
  const o = { ...r };
  for (const k of ['costPrice', 'sellPrice', 'profit', 'totalCost', 'rating', 'estimatedCost', 'estimatedMargin', 'myPrice']) {
    if (typeof o[k] === 'string') o[k] = Number(o[k]);
  }
  return o;
}

// --- Mock db ---
const db = {
  select: (..._args: any[]) => ({
    from: (table: any) => {
      const qb = new QueryBuilder(table._table);
      const origThen = qb.then.bind(qb);
      qb.then = (resolve: any, reject?: any) => origThen((data: any) => resolve(data.map(normalizeRow)), reject);
      return qb;
    },
  }),
  insert: (table: any) => ({
    values: (data: any) => {
      const now = new Date();
      const record = { ...data, id: idCounter++ };
      if (!record.createdAt) record.createdAt = now;
      if (!record.updatedAt) record.updatedAt = now;
      inMemoryData[table._table] = inMemoryData[table._table] || {};
      inMemoryData[table._table][record.id] = { ...record };
      return {
        returning: () => [normalizeRow(record)],
        onConflictDoUpdate: () => [normalizeRow(record)],
      };
    },
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (_condition: any) => ({
        returning: () => {
          const items = Object.values(inMemoryData[table._table] || {});
          for (const item of items) Object.assign(item, data);
          return items.map(normalizeRow);
        },
      }),
    }),
  }),
  delete: (table: any) => ({
    where: (condition: any) => ({
      returning: () => {
        const id = Number(condition?._value);
        const found = inMemoryData[table._table]?.[id];
        delete inMemoryData[table._table]?.[id];
        return found ? [normalizeRow(found)] : [];
      },
    }),
  }),
};

export { db };
export {
  productsTable, suppliersTable, ordersTable, researchTable, supplierFinderTable,
  priceWatchTable, priceSnapshotsTable, purchaseOrdersTable, purchaseOrderItemsTable,
  returnsTable, orderTimelineTable, promotionsTable, productTagsTable, productTagLinksTable,
  launchesTable, adCampaignsTable, storeConnectionsTable, syncLogsTable, aiSettingsTable, fulfillmentQueueTable,
};

// Named re-exports for drizzle-orm � just the mock functions
const eq = mockEq;
const desc = mockDesc;
const asc = mockAsc;
const count = mockCount;
const inArray = mockInArray;
const gte = mockGte;
const lt = mockLt;
const and = mockAnd;
const sql = mockSql;

export { eq, desc, asc, count, inArray, gte, lt, and, sql };

// Helpers for assertions in tests
export function resetDb() { Object.keys(inMemoryData).forEach(k => inMemoryData[k] = {}); idCounter = 1; }
export function seedTable(tableName: string, records: any[]) {
  const now = new Date();
  return records.map(r => {
    const record = { ...r, id: idCounter++, createdAt: r.createdAt ? new Date(r.createdAt) : now, updatedAt: r.updatedAt ? new Date(r.updatedAt) : now };
    inMemoryData[tableName] = inMemoryData[tableName] || {};
    inMemoryData[tableName][record.id] = record;
    return normalizeRow(record);
  });
}
export function getTableData(tableName: string) { return Object.values(inMemoryData[tableName] || {}); }


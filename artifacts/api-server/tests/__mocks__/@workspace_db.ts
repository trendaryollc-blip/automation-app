/**
 * Shared in-memory database shim for Vitest.
 *
 * It provides a Drizzle-like query interface for route tests while also exporting
 * the Firestore helper functions that the API routes import during test runs.
 *
 * v2 — adds a `users` table and a `userId` column to every business table so
 * that the multi-tenant routes can be exercised in isolation.
 */
const inMemoryData: Record<string, Record<number, any>> = {};
let idCounter = 1;

class QueryBuilder {
  private _table: string;
  private _where: any[] = [];
  private _orderBy: { field: string; dir: "asc" | "desc" }[] = [];
  private _limitVal: number | null = null;
  private _projection: Record<string, any> | undefined;

  constructor(table: string, projection?: Record<string, any>) {
    this._table = table;
    this._projection = projection;
  }

  $dynamic() {
    return this;
  }

  where(condition: any) {
    if (condition) this._where.push(condition);
    return this;
  }

  orderBy(...args: any[]) {
    for (const arg of args) {
      if (arg && typeof arg === "object" && arg._field) {
        this._orderBy.push({
          field: String(arg._field),
          dir: arg._dir || "asc",
        });
      }
    }
    return this;
  }

  limit(n: number) {
    this._limitVal = n;
    return this;
  }

  private _matches(item: any, condition: any): boolean {
    if (!condition) return true;
    if (condition._and) {
      return condition._and.every((cond: any) => this._matches(item, cond));
    }
    if (condition._sql) return true;
    const field = condition._field;
    const value = condition._value;
    const values = condition._values;
    switch (condition.operator) {
      case "gte":
        return item[field] >= value;
      case "lte":
        return item[field] <= value;
      case "lt":
        return item[field] < value;
      case "in":
        return Array.isArray(values) && values.includes(item[field]);
      case "count":
        return true;
      default:
        return item[field] === value;
    }
  }

  private _applyProjection(rows: any[]) {
    if (!this._projection) return rows;
    const entries = Object.entries(this._projection);
    const hasAggregation = entries.some(
      ([, expr]) =>
        expr &&
        typeof expr === "object" &&
        (expr.operator === "count" || expr._sql),
    );
    if (hasAggregation) {
      const projection: Record<string, any> = {};
      for (const [alias, expr] of entries) {
        if (expr && typeof expr === "object" && expr.operator === "count") {
          projection[alias] = rows.length;
        } else if (expr && typeof expr === "object" && expr._sql) {
          projection[alias] = 0;
        } else {
          projection[alias] = undefined;
        }
      }
      return [projection];
    }
    return rows.map((row) => {
      const projection: Record<string, any> = {};
      for (const [alias, expr] of entries) {
        if (expr && typeof expr === "object" && expr._field) {
          projection[alias] = row[expr._field];
        } else if (typeof expr === "string") {
          projection[alias] = row[expr];
        } else {
          projection[alias] = row[alias];
        }
      }
      return projection;
    });
  }

  private _getData(): any[] {
    let data = Object.values(inMemoryData[this._table] || {}).map(normalizeRow);
    for (const condition of this._where) {
      data = data.filter((item) => this._matches(item, condition));
    }
    for (const { field, dir } of this._orderBy) {
      data.sort((a, b) => {
        const av = a[field] instanceof Date ? a[field].getTime() : a[field];
        const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
        return dir === "desc" ? (bv > av ? 1 : -1) : av > bv ? 1 : -1;
      });
    }
    if (this._limitVal != null) data = data.slice(0, this._limitVal);
    return this._applyProjection(data);
  }

  then(resolve: (val: any[]) => void, _reject?: (err: any) => void) {
    return Promise.resolve(this._getData()).then(resolve, _reject);
  }

  catch(reject: (err: any) => void) {
    this.then(() => {}, reject);
  }

  finally(fn: () => void) {
    this.then(fn, fn);
  }

  [Symbol.toStringTag] = "QueryBuilder";
}

function toField(fieldOrCol: string | { name?: string }): string {
  return typeof fieldOrCol === "string" ? fieldOrCol : (fieldOrCol.name ?? "");
}
function mockEq(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: "eq" };
}
function mockDesc(field: string | { name?: string }) {
  return { _field: toField(field), _dir: "desc" as const };
}
function mockAsc(field: string | { name?: string }) {
  return { _field: toField(field), _dir: "asc" as const };
}
function mockCount() {
  return { _field: "count(*)", operator: "count" };
}
function mockInArray(field: string | { name?: string }, values: any[]) {
  return { _field: toField(field), _values: values, operator: "in" };
}
function mockGte(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: "gte" };
}
function mockLte(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: "lte" };
}
function mockLt(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: "lt" };
}
function mockAnd(...conditions: any[]) {
  return { _and: conditions, operator: "and" };
}
function mockSql(strings: TemplateStringsArray, ..._values: any[]) {
  return { _sql: strings.join("?"), _values: _values };
}

function makeTable(name: string) {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "_table") return name;
        if (prop === "$inferSelect" || prop === "$inferInsert") return {};
        if (typeof prop === "symbol") return undefined;
        return { name: String(prop) };
      },
    },
  );
}

const usersTable = makeTable("users");
const productsTable = makeTable("products");
const suppliersTable = makeTable("suppliers");
const ordersTable = makeTable("orders");
const researchTable = makeTable("research");
const supplierFinderTable = makeTable("supplier_finder");
const priceWatchTable = makeTable("price_watch");
const priceSnapshotsTable = makeTable("price_snapshots");
const purchaseOrdersTable = makeTable("purchase_orders");
const purchaseOrderItemsTable = makeTable("purchase_order_items");
const returnsTable = makeTable("returns");
const orderTimelineTable = makeTable("order_timeline");
const promotionsTable = makeTable("promotions");
const productTagsTable = makeTable("product_tags");
const productTagLinksTable = makeTable("product_tag_links");
const launchesTable = makeTable("launches");
const adCampaignsTable = makeTable("ad_campaigns");
const storeConnectionsTable = makeTable("store_connections");
const syncLogsTable = makeTable("sync_logs");
const aiSettingsTable = makeTable("ai_settings");
const fulfillmentQueueTable = makeTable("fulfillment_queue");

function normalizeRow(r: any) {
  if (!r) return r;
  const o = { ...r };
  for (const k of [
    "costPrice",
    "sellPrice",
    "profit",
    "totalCost",
    "rating",
    "estimatedCost",
    "estimatedMargin",
    "myPrice",
  ]) {
    if (typeof o[k] === "string") o[k] = Number(o[k]);
  }
  return o;
}

function resolveMatchingIds(tableName: string, condition: any): number[] {
  if (!condition) return Object.keys(inMemoryData[tableName] || {}).map(Number);
  if (condition._and) {
    return (
      condition._and.reduce(
        (ids: number[] | null, cond: any) => {
          const matched = resolveMatchingIds(tableName, cond);
          return ids === null
            ? matched
            : ids.filter((id) => matched.includes(id));
        },
        null as number[] | null,
      ) ?? []
    );
  }
  const value = condition._value;
  const values = condition._values;
  return Object.entries(inMemoryData[tableName] || {})
    .filter(([, item]) => {
      const fieldValue = item[condition._field];
      if (values) return values.includes(fieldValue);
      if (condition.operator === "gte") return fieldValue >= value;
      if (condition.operator === "lte") return fieldValue <= value;
      if (condition.operator === "lt") return fieldValue < value;
      return fieldValue === value;
    })
    .map(([id]) => Number(id));
}

const db = {
  select: (projection?: Record<string, any>) => ({
    from: (table: any) => {
      const qb = new QueryBuilder(table._table, projection);
      return qb;
    },
  }),
  insert: (table: any) => ({
    values: (data: any) => {
      const now = new Date();
      const rows = Array.isArray(data) ? data : [data];
      const inserted = rows.map((row) => {
        const record = { ...row, id: idCounter++ };
        if (!record.createdAt) record.createdAt = now;
        if (!record.updatedAt) record.updatedAt = now;
        if (!record.recordedAt) record.recordedAt = now;
        inMemoryData[table._table] = inMemoryData[table._table] || {};
        inMemoryData[table._table][record.id] = { ...record };
        return normalizeRow(record);
      });
      return {
        returning: () => inserted,
        onConflictDoUpdate: (_config: any) => ({ returning: () => inserted }),
        onConflictDoNothing: () => ({ returning: () => [] }),
      };
    },
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => {
        const matchingIds = resolveMatchingIds(table._table, condition);
        const items = matchingIds
          .map((id: number) => inMemoryData[table._table]?.[id])
          .filter(Boolean);
        for (const item of items) Object.assign(item, data);
        const result = items.map(normalizeRow);
        const promise = Promise.resolve(result);
        return {
          returning: () => result,
          then: (resolve: (val: any) => void, reject?: (err: any) => void) =>
            promise.then(resolve, reject),
          catch: (reject: (err: any) => void) => promise.catch(reject),
          finally: (fn: () => void) => promise.finally(fn),
          [Symbol.toStringTag]: "Promise",
        } as any;
      },
    }),
  }),
  delete: (table: any) => ({
    where: (condition: any) => {
      const matchingIds = resolveMatchingIds(table._table, condition);
      const deleted: any[] = [];
      for (const id of matchingIds) {
        const found = inMemoryData[table._table]?.[id];
        if (found) {
          deleted.push(normalizeRow(found));
          delete inMemoryData[table._table]?.[id];
        }
      }
      const promise = Promise.resolve(deleted);
      return {
        returning: () => deleted,
        then: (resolve: (val: any) => void, reject?: (err: any) => void) =>
          promise.then(resolve, reject),
        catch: (reject: (err: any) => void) => promise.catch(reject),
        finally: (fn: () => void) => promise.finally(fn),
        [Symbol.toStringTag]: "Promise",
      } as any;
    },
  }),
};

export { db };
export {
  usersTable,
  productsTable,
  suppliersTable,
  ordersTable,
  researchTable,
  supplierFinderTable,
  priceWatchTable,
  priceSnapshotsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  returnsTable,
  orderTimelineTable,
  promotionsTable,
  productTagsTable,
  productTagLinksTable,
  launchesTable,
  adCampaignsTable,
  storeConnectionsTable,
  syncLogsTable,
  aiSettingsTable,
  fulfillmentQueueTable,
};

const eq = mockEq;
const desc = mockDesc;
const asc = mockAsc;
const count = mockCount;
const inArray = mockInArray;
const gte = mockGte;
const lte = mockLte;
const lt = mockLt;
const and = mockAnd;
const sql = mockSql;

export { eq, desc, asc, count, inArray, gte, lte, lt, and, sql };

export const mockModule = {
  db,
  usersTable,
  productsTable,
  suppliersTable,
  ordersTable,
  researchTable,
  supplierFinderTable,
  priceWatchTable,
  priceSnapshotsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  returnsTable,
  orderTimelineTable,
  promotionsTable,
  productTagsTable,
  productTagLinksTable,
  launchesTable,
  adCampaignsTable,
  storeConnectionsTable,
  syncLogsTable,
  aiSettingsTable,
  fulfillmentQueueTable,
  eq,
  desc,
  asc,
  count,
  inArray,
  gte,
  lte,
  lt,
  and,
  sql,
  resetDb,
  seedTable,
  getTableData,
};
export default mockModule;

export function resetDb() {
  Object.keys(inMemoryData).forEach((k) => (inMemoryData[k] = {}));
  idCounter = 1;
}

export function seedTable(tableName: string, records: any[]) {
  const now = new Date();
  return records.map((r) => {
    const id = r.id != null ? r.id : idCounter++;
    if (id >= idCounter) idCounter = id + 1;
    const record = {
      ...r,
      id,
      createdAt: r.createdAt ? new Date(r.createdAt) : now,
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : now,
      recordedAt: r.recordedAt ? new Date(r.recordedAt) : now,
    };
    inMemoryData[tableName] = inMemoryData[tableName] || {};
    inMemoryData[tableName][record.id] = record;
    return normalizeRow(record);
  });
}

export function getTableData(tableName: string) {
  return Object.values(inMemoryData[tableName] || {}).map(normalizeRow);
}

export function isFirestoreMode() {
  return false;
}

export function aiSettingsRepo() {
  return {
    findMany: async () => [],
    findById: async () => null,
    findOne: async () => null,
    createWithId: async () => ({}),
    remove: async () => true,
  };
}

// Test-only auth helpers.  Duplicated here (instead of imported from
// "@workspace/db/test-utils") because the vitest module alias redirects
// any "@workspace/db/*" import back to this same mock file — so the
// subpath would self-reference.  Keep these in sync with
// `lib/db/src/test-utils.ts`.
import { createHmac } from "node:crypto";

const TEST_JWT_SECRET =
  process.env["JWT_SECRET"] ||
  createHmac("sha256", "").update("dropflow-test-secret").digest("hex");

export interface FakeUser {
  id: number;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export function makeFakeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 1,
    email: "test@example.com",
    name: "Test User",
    passwordHash: "$2a$12$invalid.hash.placeholder.value.xxxxxxxxxxxxxx",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeAuthToken(userId: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: String(userId), iat: now, exp: now + 3600 };
  const b64u = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const headerB64 = b64u(header);
  const payloadB64 = b64u(payload);
  const sig = createHmac("sha256", TEST_JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${headerB64}.${payloadB64}.${sig}`;
}

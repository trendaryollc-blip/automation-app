/**
 * Firestore Repository - Generic CRUD operations for Firestore collections.
 *
 * This provides a query interface similar to Drizzle ORM so that
 * API route handlers can work with either PostgreSQL or Firestore.
 */

import { getFirestoreDb, isFirestoreMode, logger } from "./index";
import {
  docToData,
  docsToData,
  COLLECTIONS,
  CollectionName,
} from "./collections";
import type { Firestore } from "firebase-admin/firestore";

// =============================================================================
// Types
// =============================================================================

export interface QueryFilter {
  field: string;
  operator: FirebaseFirestore.WhereFilterOp;
  value: unknown;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: { field: string; direction?: "asc" | "desc" };
  limit?: number;
  offset?: number;
}

// =============================================================================
// Generic Repository
// =============================================================================

export function createRepository<T extends Record<string, unknown>>(
  collectionName: CollectionName,
) {
  const db = () => getFirestoreDb();
  const collection = () => db().collection(collectionName);

  /**
   * Find all documents matching the query options
   */
  async function findMany(options?: QueryOptions): Promise<T[]> {
    let query: FirebaseFirestore.Query = collection();

    if (options?.filters) {
      for (const filter of options.filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }
    }

    if (options?.orderBy) {
      query = query.orderBy(
        options.orderBy.field,
        options.orderBy.direction || "asc",
      );
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const snapshot = await query.get();
    return docsToData<T>(snapshot);
  }

  /**
   * Find a single document by ID
   */
  async function findById(id: string): Promise<T | null> {
    const doc = await collection().doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as unknown as T;
  }

  /**
   * Find a single document matching the filters
   */
  async function findOne(options: QueryOptions): Promise<T | null> {
    const results = await findMany({ ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new document
   */
  async function create(data: Partial<T>): Promise<T> {
    const docRef = await collection().add(data as Record<string, unknown>);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as T;
  }

  /**
   * Create a new document with a specific ID
   */
  async function createWithId(id: string, data: Partial<T>): Promise<T> {
    await collection()
      .doc(id)
      .set(data as Record<string, unknown>);
    const doc = await collection().doc(id).get();
    return { id: doc.id, ...doc.data() } as unknown as T;
  }

  /**
   * Update a document by ID
   */
  async function update(id: string, data: Partial<T>): Promise<T | null> {
    await collection()
      .doc(id)
      .update(data as Record<string, unknown>);
    return findById(id);
  }

  /**
   * Delete a document by ID
   */
  async function remove(id: string): Promise<boolean> {
    await collection().doc(id).delete();
    return true;
  }

  /**
   * Count documents matching the filters
   */
  async function count(options?: { filters?: QueryFilter[] }): Promise<number> {
    let query: FirebaseFirestore.Query = collection();

    if (options?.filters) {
      for (const filter of options.filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  return {
    findMany,
    findById,
    findOne,
    create,
    createWithId,
    update,
    remove,
    count,
  };
}

// =============================================================================
// Pre-built Repositories
// =============================================================================

export const productsRepo = () => createRepository(COLLECTIONS.PRODUCTS);
export const suppliersRepo = () => createRepository(COLLECTIONS.SUPPLIERS);
export const ordersRepo = () => createRepository(COLLECTIONS.ORDERS);
export const orderTimelineRepo = () =>
  createRepository(COLLECTIONS.ORDER_TIMELINE);
export const purchaseOrdersRepo = () =>
  createRepository(COLLECTIONS.PURCHASE_ORDERS);
export const returnsRepo = () => createRepository(COLLECTIONS.RETURNS);
export const researchRepo = () => createRepository(COLLECTIONS.RESEARCH);
export const fulfillmentQueueRepo = () =>
  createRepository(COLLECTIONS.FULFILLMENT_QUEUE);
export const promotionsRepo = () => createRepository(COLLECTIONS.PROMOTIONS);
export const priceWatchRepo = () => createRepository(COLLECTIONS.PRICE_WATCH);
export const priceSnapshotsRepo = () =>
  createRepository(COLLECTIONS.PRICE_SNAPSHOTS);
export const productTagsRepo = () => createRepository(COLLECTIONS.PRODUCT_TAGS);
export const storeConnectionsRepo = () =>
  createRepository(COLLECTIONS.STORE_CONNECTIONS);
export const launchesRepo = () => createRepository(COLLECTIONS.LAUNCHES);
export const adCampaignsRepo = () => createRepository(COLLECTIONS.AD_CAMPAIGNS);
export const aiSettingsRepo = () => createRepository(COLLECTIONS.AI_SETTINGS);
export const customerInsightsRepo = () =>
  createRepository(COLLECTIONS.CUSTOMER_INSIGHTS);
export const cashFlowRepo = () => createRepository(COLLECTIONS.CASH_FLOW);
export const supplierFinderRepo = () =>
  createRepository(COLLECTIONS.SUPPLIER_FINDER);

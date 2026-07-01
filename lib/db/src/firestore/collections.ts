/**
 * Firestore collection names and helper functions.
 *
 * Each Drizzle table maps to a Firestore collection with the same name.
 * Documents use auto-generated IDs (or the `id` field from PostgreSQL).
 *
 * Every business collection is multi-tenant — the `userId` field on each
 * document is the only way to scope queries.  The `users` collection
 * stores account records (one per signup).
 */

export const COLLECTIONS = {
  USERS: "users",
  PRODUCTS: "products",
  SUPPLIERS: "suppliers",
  ORDERS: "orders",
  ORDER_TIMELINE: "order_timeline",
  PURCHASE_ORDERS: "purchase_orders",
  RETURNS: "returns",
  RESEARCH: "research",
  FULFILLMENT_QUEUE: "fulfillment_queue",
  PROMOTIONS: "promotions",
  PRICE_WATCH: "price_watch",
  PRICE_SNAPSHOTS: "price_snapshots",
  PRODUCT_TAGS: "product_tags",
  STORE_CONNECTIONS: "store_connections",
  SYNC_LOGS: "sync_logs",
  LAUNCHES: "launches",
  AD_CAMPAINS: "ad_campaigns",
  AI_SETTINGS: "ai_settings",
  CUSTOMER_INSIGHTS: "customer_insights",
  CASH_FLOW: "cash_flow",
  SUPPLIER_FINDER: "supplier_finder",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * Convert a Firestore document snapshot to a typed object with id
 */
export function docToData<T extends Record<string, unknown>>(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): T {
  return {
    id: doc.id,
    ...doc.data(),
  } as unknown as T;
}

/**
 * Convert an array of Firestore document snapshots to typed objects
 */
export function docsToData<T extends Record<string, unknown>>(
  snapshot: FirebaseFirestore.QuerySnapshot,
): T[] {
  return snapshot.docs.map((doc) => docToData<T>(doc));
}

/**
 * Build a "where userId = X" filter for any business collection.
 * Use this on every query that targets a tenant.
 */
export function userIdFilter(userId: number) {
  return {
    field: "userId" as const,
    operator: "==" as const,
    value: userId,
  };
}

/**
 * Firestore database initialization and client export.
 *
 * Usage:
 *   import { firestoreDb } from "@workspace/db/firestore";
 *   const products = await firestoreDb.collection("products").get();
 *
 * Environment variables:
 *   - FIREBASE_PROJECT_ID: Firebase project ID
 *   - FIREBASE_CLIENT_EMAIL: Service account client email
 *   - FIREBASE_PRIVATE_KEY: Service account private key
 *   - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON (local dev)
 *   - DATABASE_URL: Fallback PostgreSQL connection string
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { aiSettingsRepo } from "./repository";
import { logger } from "./logger";

let firestoreDb: Firestore | null = null;
let dbMode: "postgres" | "firestore" = "postgres";

function getDbMode(): "postgres" | "firestore" {
  const mode = process.env["DB_MODE"] || "postgres";
  if (mode !== "postgres" && mode !== "firestore") {
    logger.warn(`Unknown DB_MODE "${mode}", falling back to postgres`);
    return "postgres";
  }
  return mode;
}

function initFirestore(): Firestore {
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  const privateKey = process.env["FIREBASE_PRIVATE_KEY"];

  // Check if already initialized
  if (getApps().length > 0) {
    return getFirestore();
  }

  // Option 1: GOOGLE_APPLICATION_CREDENTIALS path set (local dev)
  if (process.env["GOOGLE_APPLICATION_CREDENTIALS"]) {
    logger.info("Initializing Firestore via GOOGLE_APPLICATION_CREDENTIALS", {
      path: process.env["GOOGLE_APPLICATION_CREDENTIALS"],
    });
    const app = initializeApp({
      projectId,
    });
    return getFirestore(app);
  }

  // Option 2: Use service account credentials from env vars
  if (projectId && clientEmail && privateKey) {
    logger.info("Initializing Firestore via service account env vars", {
      projectId,
    });
    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
    return getFirestore(app);
  }

  // Option 3: Use application default credentials (ADC)
  logger.info("Initializing Firestore via Application Default Credentials");
  const app = initializeApp({ projectId });
  return getFirestore(app);
}

/**
 * Returns the Firestore database instance. Initializes it on first call.
 */
export function getFirestoreDb(): Firestore {
  if (!firestoreDb) {
    dbMode = getDbMode();
    if (dbMode === "firestore") {
      firestoreDb = initFirestore();
    } else {
      throw new Error(
        "Firestore is not initialized. Set DB_MODE=firestore in your environment.",
      );
    }
  }
  return firestoreDb;
}

/**
 * Check if Firestore mode is active
 */
export function isFirestoreMode(): boolean {
  dbMode = getDbMode();
  return dbMode === "firestore";
}

/**
 * Get current database mode
 */
export function getDatabaseMode(): "postgres" | "firestore" {
  dbMode = getDbMode();
  return dbMode;
}

export { logger, aiSettingsRepo };
export type { Firestore };

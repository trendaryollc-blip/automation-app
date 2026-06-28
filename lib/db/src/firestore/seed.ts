/**
 * Firestore seed script.
 * 
 * Run: pnpm --filter @workspace/db run seed:firestore
 */

import { getFirestoreDb, logger } from "./index";

const SEED_PRODUCTS = [
  {
    name: "Wireless Bluetooth Earbuds",
    category: "Electronics",
    niche: "Audio",
    costPrice: 12.5,
    sellPrice: 39.99,
    status: "hunting",
    description: "High-quality wireless earbuds with noise cancellation",
    imageUrl: "https://picsum.photos/seed/earbuds/400/400",
    sourceUrl: "https://example.com/earbuds",
    stockQuantity: 150,
    stockThreshold: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "Yoga Mat Premium",
    category: "Fitness",
    niche: "Home Gym",
    costPrice: 8.0,
    sellPrice: 29.99,
    status: "researching",
    description: "Extra thick non-slip yoga mat for home workouts",
    imageUrl: "https://picsum.photos/seed/yoga/400/400",
    sourceUrl: "https://example.com/yoga-mat",
    stockQuantity: 200,
    stockThreshold: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "LED Desk Lamp",
    category: "Home Office",
    niche: "Lighting",
    costPrice: 15.0,
    sellPrice: 45.99,
    status: "listed",
    description: "Adjustable LED desk lamp with USB charging port",
    imageUrl: "https://picsum.photos/seed/lamp/400/400",
    sourceUrl: "https://example.com/desk-lamp",
    stockQuantity: 80,
    stockThreshold: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    margin: 65.2,
  },
];

const SEED_SUPPLIERS = [
  {
    name: "TechSource Global",
    country: "China",
    rating: 4.5,
    minOrder: 50,
    shippingDays: 15,
    website: "https://techsource.example.com",
    contactEmail: "sales@techsource.example.com",
    notes: "Reliable electronics supplier",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "FitGear Wholesale",
    country: "Vietnam",
    rating: 4.2,
    minOrder: 100,
    shippingDays: 20,
    website: "https://fitgear.example.com",
    contactEmail: "orders@fitgear.example.com",
    notes: "Good quality fitness equipment",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seed() {
  logger.info("Starting Firestore seed...");

  const db = getFirestoreDb();

  // Seed products
  const productsCollection = db.collection("products");
  for (const product of SEED_PRODUCTS) {
    const docRef = await productsCollection.add(product);
    logger.info(`Created product: ${docRef.id} - ${product.name}`);
  }

  // Seed suppliers
  const suppliersCollection = db.collection("suppliers");
  for (const supplier of SEED_SUPPLIERS) {
    const docRef = await suppliersCollection.add(supplier);
    logger.info(`Created supplier: ${docRef.id} - ${supplier.name}`);
  }

  logger.info("Firestore seed completed successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

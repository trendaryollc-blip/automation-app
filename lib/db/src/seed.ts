/**
 * Database seed script.
 *
 * Creates one demo user and assigns it as the owner of all seeded
 * data. Useful for local development.
 *
 * SAFETY: This script refuses to run in production (NODE_ENV=production).
 * If you really need a starter dataset, run with FORCE_SEED=1.
 */
import { randomBytes } from "node:crypto";
import {
  db,
  usersTable,
  suppliersTable,
  productsTable,
  ordersTable,
} from "./index.js";
import { hashPassword } from "./auth-utils.js";

function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

async function seed() {
  console.log("Seeding database...");

  if (isProduction() && process.env["FORCE_SEED"] !== "1") {
    throw new Error(
      "Refusing to run seed in production. " +
        "If you really mean it, set FORCE_SEED=1 and NODE_ENV=production.",
    );
  }

  if (!db) {
    throw new Error(
      "Database client is not initialized. Ensure DATABASE_URL is set and DB_MODE is postgres.",
    );
  }

  // ---------------------------------------------------------------------------
  // Demo user
  //
  // In dev, password is fixed for convenience. In production (only with
  // FORCE_SEED=1) we generate a random password and print it so the
  // operator can capture it.
  // ---------------------------------------------------------------------------
  const demoPassword = isProduction()
    ? randomBytes(18).toString("base64url")
    : "demo-password-123";
  const passwordHash = await hashPassword(demoPassword);
  const demoEmail = isProduction()
    ? `seed-${Date.now()}@dropflow.local`
    : "demo@dropflow.local";
  const [demoUser] = await db
    .insert(usersTable)
    .values({
      email: demoEmail,
      passwordHash,
      name: "Demo User",
    })
    .returning();
  const userId = demoUser.id;
  console.log(`Created demo user (id=${userId}, email=${demoEmail})`);
  if (isProduction()) {
    console.log(`[seed] Generated password (capture it now): ${demoPassword}`);
  }

  // ---------------------------------------------------------------------------
  // Suppliers
  // ---------------------------------------------------------------------------
  const suppliers = await db
    .insert(suppliersTable)
    .values([
      {
        userId,
        name: "AliSource Global",
        country: "China",
        rating: "4.7",
        minOrder: 10,
        shippingDays: 7,
        website: "https://alisource.example.com",
        contactEmail: "orders@alisource.example.com",
        notes: "Reliable electronics supplier. Fast processing.",
      },
      {
        userId,
        name: "EuroLogistics BV",
        country: "Netherlands",
        rating: "4.5",
        minOrder: 5,
        shippingDays: 3,
        website: "https://eurologistics.example.com",
        contactEmail: "supply@eurologistics.example.com",
        notes: "Fast EU-based fulfillment.",
      },
      {
        userId,
        name: "Sunrise Wholesale",
        country: "United States",
        rating: "4.2",
        minOrder: 25,
        shippingDays: 5,
        website: "https://sunrisewholesale.example.com",
        contactEmail: "sales@sunrise.example.com",
        notes: "Good for home goods and lifestyle products.",
      },
      {
        userId,
        name: "HK Tech Imports",
        country: "Hong Kong",
        rating: "4.8",
        minOrder: 1,
        shippingDays: 10,
        website: "https://hktech.example.com",
        contactEmail: "hktech@example.com",
        notes: "Best prices on electronics. High volume discounts available.",
      },
    ])
    .returning();

  console.log(`Inserted ${suppliers.length} suppliers`);

  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------
  const products = await db
    .insert(productsTable)
    .values([
      {
        userId,
        name: "Wireless Earbuds Pro",
        category: "Electronics",
        niche: "Audio accessories",
        costPrice: "18.50",
        sellPrice: "49.99",
        status: "listed",
        description: "Premium wireless earbuds with active noise cancellation.",
        sourceUrl: "https://hktech.example.com/earbuds-pro",
        supplierId: suppliers[3].id,
        stockQuantity: 85,
        stockThreshold: 20,
      },
      {
        userId,
        name: "Portable Phone Stand",
        category: "Accessories",
        niche: "WFH / desk setup",
        costPrice: "4.20",
        sellPrice: "14.99",
        status: "listed",
        description: "Adjustable aluminum phone and tablet stand.",
        sourceUrl: "https://alisource.example.com/phone-stand",
        supplierId: suppliers[0].id,
        stockQuantity: 6,
        stockThreshold: 15,
      },
      {
        userId,
        name: "LED Desk Lamp",
        category: "Home Office",
        niche: "WFH / desk setup",
        costPrice: "12.00",
        sellPrice: "34.99",
        status: "listed",
        description: "Touch-controlled LED desk lamp with USB charging port.",
        sourceUrl: "https://alisource.example.com/led-lamp",
        supplierId: suppliers[0].id,
        stockQuantity: 42,
        stockThreshold: 15,
      },
      {
        userId,
        name: "Yoga Mat Premium",
        category: "Sports & Fitness",
        niche: "Home fitness",
        costPrice: "9.80",
        sellPrice: "29.99",
        status: "listed",
        description: "6mm non-slip yoga mat with carrying strap.",
        sourceUrl: "https://sunrisewholesale.example.com/yoga-mat",
        supplierId: suppliers[2].id,
        stockQuantity: 8,
        stockThreshold: 20,
      },
      {
        userId,
        name: "Smart Watch Fitness Tracker",
        category: "Electronics",
        niche: "Wearables",
        costPrice: "22.00",
        sellPrice: "69.99",
        status: "listed",
        description: "Waterproof fitness tracker with heart rate monitor.",
        sourceUrl: "https://hktech.example.com/smartwatch",
        supplierId: suppliers[3].id,
        stockQuantity: 55,
        stockThreshold: 10,
      },
      {
        userId,
        name: "Reusable Water Bottle",
        category: "Lifestyle",
        niche: "Eco products",
        costPrice: "5.50",
        sellPrice: "18.99",
        status: "listed",
        description: "500ml insulated stainless steel water bottle.",
        sourceUrl: "https://sunrisewholesale.example.com/water-bottle",
        supplierId: suppliers[2].id,
        stockQuantity: 120,
        stockThreshold: 25,
      },
      {
        userId,
        name: "Car Phone Mount",
        category: "Automotive",
        niche: "Car accessories",
        costPrice: "3.80",
        sellPrice: "12.99",
        status: "researching",
        description: "Magnetic dashboard phone holder.",
        sourceUrl: "https://alisource.example.com/car-mount",
        supplierId: suppliers[0].id,
        stockQuantity: 0,
        stockThreshold: 20,
      },
      {
        userId,
        name: "Massage Gun Mini",
        category: "Health & Wellness",
        niche: "Recovery tools",
        costPrice: "28.00",
        sellPrice: "89.99",
        status: "hunting",
        sourceUrl: "https://hktech.example.com/massage-gun",
        stockQuantity: 0,
        stockThreshold: 5,
      },
      {
        userId,
        name: "Posture Corrector",
        category: "Health & Wellness",
        niche: "WFH ergonomics",
        costPrice: "8.00",
        sellPrice: "27.99",
        status: "archived",
        notes: "Seasonal seller. Re-evaluate Q1.",
        stockQuantity: 3,
        stockThreshold: 10,
      },
      {
        userId,
        name: "Bamboo Cutting Board Set",
        category: "Kitchen",
        niche: "Eco home",
        costPrice: "11.00",
        sellPrice: "36.99",
        status: "listed",
        supplierId: suppliers[1].id,
        stockQuantity: 30,
        stockThreshold: 10,
      },
    ])
    .returning();

  console.log(`Inserted ${products.length} products`);

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------
  const now = new Date();
  function daysAgo(d: number) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    return dt;
  }

  const customers = [
    { name: "Sophie Turner", email: "sophie@example.com" },
    { name: "James Okafor", email: "james@example.com" },
    { name: "Mei Lin", email: "mei@example.com" },
    { name: "Carlos Rivera", email: "carlos@example.com" },
    { name: "Emma Kowalski", email: "emma@example.com" },
    { name: "David Adeyemi", email: "david@example.com" },
    { name: "Aisha Hassan", email: "aisha@example.com" },
    { name: "Lucas Petit", email: "lucas@example.com" },
  ];

  type OrderStatus =
    "pending" | "placed" | "shipped" | "delivered" | "cancelled";
  const orderRows: {
    userId: number;
    orderNumber: string;
    productId: number;
    productName: string;
    supplierId: number | null;
    supplierName: string | null;
    customerName: string;
    customerEmail: string;
    quantity: number;
    costPrice: string;
    sellPrice: string;
    profit: string;
    status: OrderStatus;
    trackingNumber: string | null;
    createdAt: Date;
    placedAt: Date | null;
  }[] = [];

  const listedProducts = products.filter((p) => p.status === "listed");

  const statuses: OrderStatus[] = [
    "delivered",
    "delivered",
    "delivered",
    "shipped",
    "placed",
    "pending",
    "cancelled",
  ];

  for (let i = 0; i < 40; i++) {
    const product = listedProducts[i % listedProducts.length];
    const customer = customers[i % customers.length];
    const qty = Math.floor(Math.random() * 3) + 1;
    const cost = Number(product.costPrice ?? 0);
    const sell = Number(product.sellPrice ?? 0);
    const profit = (sell - cost) * qty;
    const daysBack = Math.floor(Math.random() * 90);
    const status: OrderStatus = statuses[i % statuses.length];
    const supplier = suppliers.find((s) => s.id === product.supplierId);

    // Order number uses a base36 timestamp + 4-char random suffix so
    // sequential business volume is not exposed in a predictable way.
    const ts = Date.now().toString(36).toUpperCase();
    const suffix = randomBytes(2).toString("hex").toUpperCase();

    orderRows.push({
      userId,
      orderNumber: `DF-${ts}${suffix}`,
      productId: product.id,
      productName: product.name,
      supplierId: supplier?.id ?? null,
      supplierName: supplier?.name ?? null,
      customerName: customer.name,
      customerEmail: customer.email,
      quantity: qty,
      costPrice: String(cost),
      sellPrice: String(sell),
      profit: String(Math.round(profit * 100) / 100),
      status,
      trackingNumber:
        status === "shipped" || status === "delivered"
          ? `TRK${100000 + i}`
          : null,
      createdAt: daysAgo(daysBack),
      placedAt: status !== "pending" ? daysAgo(daysBack - 1) : null,
    });
  }

  await db.insert(ordersTable).values(orderRows as any[]);
  console.log(`Inserted ${orderRows.length} orders`);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

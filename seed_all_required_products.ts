import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config({ path: 'c:/Users/cristian/Downloads/proyectoFINAL.claude/proyecto.claude/control-pedidos-app/.env' });

import { getDb } from './server/db';
import { products, inventory } from './drizzle/schema';
import { eq, or, like } from 'drizzle-orm';

interface SimpleProduct {
  code: string;
  name: string;
  category: "finished_product" | "raw_material" | "supplies" | "insumo";
  price: number; // in cents
  salePrice: number; // in cents
  unit: string;
  productionRole: "none" | "milk" | "sugar" | "culture" | "bottle" | "cap" | "label" | "packaging" | "finished_good" | "other";
  presentationVolumeMl?: number;
  initialStock: number;
}

const productsToSeed: SimpleProduct[] = [
  // Raw materials
  { code: 'MAT-LECHE-ENTERA', name: 'Leche Entera', category: 'raw_material', price: 600, salePrice: 0, unit: 'L', productionRole: 'milk', presentationVolumeMl: 1000, initialStock: 150 },
  { code: 'MAT-LECHE-DESCREMADA', name: 'Leche Descremada', category: 'raw_material', price: 650, salePrice: 0, unit: 'L', productionRole: 'milk', presentationVolumeMl: 1000, initialStock: 100 },
  { code: 'MAT-AZUCAR-MORENA', name: 'Azúcar Morena', category: 'raw_material', price: 500, salePrice: 0, unit: 'kg', productionRole: 'sugar', initialStock: 50 },
  { code: 'MAT-AZUCAR-BLANCA', name: 'Azúcar Blanca', category: 'raw_material', price: 450, salePrice: 0, unit: 'kg', productionRole: 'sugar', initialStock: 50 },
  
  // Packaging / Supplies (insumos)
  { code: 'ENV-BOTELLA-500ML', name: 'Botella 500ml', category: 'insumo', price: 100, salePrice: 0, unit: 'unidad', productionRole: 'bottle', presentationVolumeMl: 500, initialStock: 500 },
  { code: 'ENV-BOTELLA-1L', name: 'Botella 1L', category: 'insumo', price: 150, salePrice: 0, unit: 'unidad', productionRole: 'bottle', presentationVolumeMl: 1000, initialStock: 300 },
  { code: 'ENV-BOTELLA-750ML', name: 'Botella 750ml', category: 'insumo', price: 130, salePrice: 0, unit: 'unidad', productionRole: 'bottle', presentationVolumeMl: 750, initialStock: 300 },
  { code: 'ENV-CONTAINER-LABNEH', name: 'Envase Labneh 250g', category: 'insumo', price: 80, salePrice: 0, unit: 'unidad', productionRole: 'bottle', initialStock: 200 },
  { code: 'ENV-TAPA', name: 'Tapa', category: 'insumo', price: 20, salePrice: 0, unit: 'unidad', productionRole: 'cap', initialStock: 1000 },
  { code: 'ENV-ETIQUETA', name: 'Etiqueta', category: 'insumo', price: 30, salePrice: 0, unit: 'unidad', productionRole: 'label', initialStock: 1000 },
  
  // Finished Goods
  { code: 'KEF-LECHE-NAT-500', name: 'Kéfir de Leche Natural 500ml', category: 'finished_product', price: 200, salePrice: 350, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 500, initialStock: 20 },
  { code: 'KEF-LECHE-FRU-500', name: 'Kéfir de Leche Frutilla 500ml', category: 'finished_product', price: 220, salePrice: 380, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 500, initialStock: 20 },
  { code: 'KEF-LECHE-COC-500', name: 'Kéfir de Leche Coco 500ml', category: 'finished_product', price: 220, salePrice: 380, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 500, initialStock: 20 },
  { code: 'KEF-LECHE-NAT-1000', name: 'Kéfir de Leche Natural 1L', category: 'finished_product', price: 350, salePrice: 600, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 1000, initialStock: 15 },
  { code: 'KEF-LECHE-FRU-750', name: 'Kéfir de Leche Frutilla 750ml', category: 'finished_product', price: 300, salePrice: 500, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 750, initialStock: 15 },
  { code: 'KEF-AGUA-NAT-500', name: 'Kéfir de Agua Natural 500ml', category: 'finished_product', price: 150, salePrice: 300, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 500, initialStock: 10 },
  { code: 'KEF-AGUA-LIM-500', name: 'Kéfir de Agua Limón 500ml', category: 'finished_product', price: 160, salePrice: 320, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 500, initialStock: 10 },
  { code: 'KEF-AGUA-JEN-500', name: 'Kéfir de Agua Jengibre 500ml', category: 'finished_product', price: 160, salePrice: 320, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 500, initialStock: 10 },
  { code: 'KEF-LABNEH-NAT-250', name: 'Queso Labneh Natural 250g', category: 'finished_product', price: 250, salePrice: 450, unit: 'unidad', productionRole: 'finished_good', initialStock: 10 },
  { code: 'KEF-SUERO-NAT-500', name: 'Suero Detox Natural 500ml', category: 'finished_product', price: 50, salePrice: 150, unit: 'unidad', productionRole: 'finished_good', presentationVolumeMl: 500, initialStock: 5 }
];

async function seedRealDb() {
  console.log("Checking Real MySQL Database connection...");
  const db = await getDb();
  if (!db) {
    console.log("-> Real MySQL Database not connected (DATABASE_URL not set or error). Skipping MySQL seed.");
    return;
  }
  
  console.log("-> Connected to MySQL. Seeding products...");
  for (const item of productsToSeed) {
    // Check if product exists by code or name
    const existing = await db.select().from(products).where(
      or(eq(products.code, item.code), eq(products.name, item.name))
    ).limit(1);

    if (existing.length === 0) {
      console.log(`Inserting product in DB: ${item.name} (${item.code})`);
      const [insertResult] = await db.insert(products).values({
        code: item.code,
        name: item.name,
        category: item.category as any,
        price: item.price,
        salePrice: item.salePrice,
        unit: item.unit,
        presentationQuantity: 1,
        presentationUnit: item.unit,
        presentationVolumeMl: item.presentationVolumeMl || 0,
        productionRole: item.productionRole as any,
        status: 'active'
      });
      
      const productId = insertResult.insertId;
      await db.insert(inventory).values({
        productId,
        quantity: item.initialStock,
        minStock: 10
      });
      console.log(`-> Inserted ${item.name} with ID ${productId} and stock ${item.initialStock}`);
    } else {
      console.log(`Product already exists in DB: ${item.name}`);
      // Ensure productionRole is set correctly
      await db.update(products).set({
        productionRole: item.productionRole as any,
        category: item.category as any
      }).where(eq(products.id, existing[0].id));
    }
  }
  console.log("Real MySQL Database seeding complete.");
}

function seedMockJson() {
  const jsonPath = path.join(process.cwd(), "server", "demo_data.json");
  console.log(`Checking Mock JSON Database at ${jsonPath}...`);
  if (!fs.existsSync(jsonPath)) {
    console.log("-> Mock JSON file does not exist. Creating default empty structure...");
    fs.writeFileSync(jsonPath, JSON.stringify({
      MOCK_CUSTOMERS: [], MOCK_USERS: [], MOCK_PRODUCTS: [], MOCK_INVENTORY: [],
      MOCK_ORDERS: [], MOCK_ORDER_ITEMS: [], MOCK_PAYMENTS: [], MOCK_MOVEMENTS: [],
      MOCK_SUPPLIERS: [], MOCK_PURCHASES: [], MOCK_PURCHASE_ITEMS: [],
      MOCK_ACCOUNTS_PAYABLE: [], MOCK_DELIVERY_EXPENSES: [], MOCK_OPERATIONAL_EXPENSES: [],
      MOCK_FINANCIAL_TRANSACTIONS: [], MOCK_CASH_CLOSURES: [], MOCK_CASH_OPENINGS: [],
      MOCK_SALES: [], MOCK_SALE_ITEMS: [], MOCK_QUOTATIONS: [], MOCK_QUOTATION_ITEMS: [],
      MOCK_DELIVERY_EXTRA_LOAD: []
    }, null, 2), "utf8");
  }

  const fileContent = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(fileContent);

  if (!data.MOCK_PRODUCTS) data.MOCK_PRODUCTS = [];
  if (!data.MOCK_INVENTORY) data.MOCK_INVENTORY = [];

  let nextProdId = data.MOCK_PRODUCTS.reduce((max: number, p: any) => Math.max(max, p.id || 0), 0) + 1;
  let nextInvId = data.MOCK_INVENTORY.reduce((max: number, i: any) => Math.max(max, i.id || 0), 0) + 1;

  for (const item of productsToSeed) {
    let existingProd = data.MOCK_PRODUCTS.find((p: any) => p.code === item.code || p.name === item.name);
    if (!existingProd) {
      console.log(`Inserting product in Mock JSON: ${item.name} (${item.code})`);
      const newProd = {
        id: nextProdId++,
        code: item.code,
        name: item.name,
        category: item.category,
        price: item.price / 100, // JSON stores price in base Bs. (not cents)
        salePrice: item.salePrice / 100,
        wholesalePrice: 0,
        discountPrice: 0,
        status: "active",
        unit: item.unit,
        presentationQuantity: 1,
        presentationUnit: item.unit,
        presentationVolumeMl: item.presentationVolumeMl || 0,
        presentationWeightGr: 0,
        productionRole: item.productionRole,
        storageLocation: "almacen",
        supplierName: null,
        productionNotes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      data.MOCK_PRODUCTS.push(newProd);
      
      const newInv = {
        id: nextInvId++,
        productId: newProd.id,
        quantity: item.initialStock,
        minStock: 10,
        lastUpdated: new Date().toISOString()
      };
      data.MOCK_INVENTORY.push(newInv);
      console.log(`-> MOCK: Inserted ${item.name} with ID ${newProd.id} and stock ${item.initialStock}`);
    } else {
      console.log(`Product already exists in Mock JSON: ${item.name}`);
      // Ensure category, productionRole and other values are aligned
      existingProd.productionRole = item.productionRole;
      existingProd.category = item.category;
      if (item.presentationVolumeMl) existingProd.presentationVolumeMl = item.presentationVolumeMl;
      
      let inv = data.MOCK_INVENTORY.find((i: any) => i.productId === existingProd.id);
      if (!inv) {
        data.MOCK_INVENTORY.push({
          id: nextInvId++,
          productId: existingProd.id,
          quantity: item.initialStock,
          minStock: 10,
          lastUpdated: new Date().toISOString()
        });
      }
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
  console.log("Mock JSON file seeding complete.");
}

async function main() {
  try {
    seedMockJson();
    await seedRealDb();
    console.log("Seeding process successfully finished!");
    process.exit(0);
  } catch (err) {
    console.error("Error in main seed:", err);
    process.exit(1);
  }
}

main();

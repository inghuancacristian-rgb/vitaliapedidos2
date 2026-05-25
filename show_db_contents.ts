import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: 'c:/Users/cristian/Downloads/proyectoFINAL.claude/proyecto.claude/control-pedidos-app/.env' });

import { getDb } from './server/db';
import { products, inventory } from './drizzle/schema';

async function run() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Failed to connect to DB");
      process.exit(1);
    }
    const allProducts = await db.select().from(products);
    const allInventory = await db.select().from(inventory);

    console.log("=== PRODUCTS ===");
    allProducts.forEach(p => {
      console.log(`ID: ${p.id} | Code: ${p.code} | Name: ${p.name} | Category: ${p.category} | Role: ${p.productionRole} | Unit: ${p.unit}`);
    });

    console.log("\n=== INVENTORY ===");
    allInventory.forEach(i => {
      const prod = allProducts.find(p => p.id === i.productId);
      console.log(`Product: ${prod ? prod.name : 'Unknown'} (ID: ${i.productId}) | Qty: ${i.quantity}`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Error inspecting database:", err);
    process.exit(1);
  }
}

run();

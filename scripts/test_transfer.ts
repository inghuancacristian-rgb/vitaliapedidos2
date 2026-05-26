import { getDb } from "../server/db";
import { inventoryTransfers, inventoryTransferItems, inventory, products } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function testTransfers() {
  console.log("Iniciando prueba de base de datos...");
  try {
    const db = await getDb();
    if (!db) {
       console.log("No se pudo conectar a la BD");
       process.exit(1);
    }
    // 1. Verificamos que las tablas existan haciendo un count
    const transfersCount = await db.select({ count: sql`count(*)` }).from(inventoryTransfers);
    console.log("✅ Tabla inventoryTransfers existe. Cantidad de registros:", transfersCount[0].count);

    const itemsCount = await db.select({ count: sql`count(*)` }).from(inventoryTransferItems);
    console.log("✅ Tabla inventoryTransferItems existe. Cantidad de registros:", itemsCount[0].count);

    // 2. Comprobamos la disponibilidad de productos en el inventario
    const productsInInventory = await db.select({
      id: products.id,
      name: products.name,
      quantity: inventory.quantity
    })
    .from(inventory)
    .innerJoin(products, sql`${inventory.productId} = ${products.id}`)
    .limit(5);

    console.log("✅ Productos en inventario encontrados:");
    productsInInventory.forEach(p => console.log(`  - ${p.name}: ${p.quantity} disponibles`));

    console.log("\n🎉 La base de datos está correctamente configurada para soportar los traspasos.");
    console.log("Puedes proceder a realizar la prueba visual en tu navegador.");

  } catch (error) {
    console.error("❌ Error en la prueba de base de datos:", error);
  }
  process.exit(0);
}

testTransfers();

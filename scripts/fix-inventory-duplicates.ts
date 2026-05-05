/**
 * Fix script: Remove duplicate inventoryMovements rows inserted twice
 * by the createSaleWithItems bug (once in the batch loop, once unconditionally after saleItems).
 */

import * as dotenv from "dotenv";
dotenv.config();

import { createConnection } from "mysql2/promise";

async function main() {
  const dbUrl = "mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway";
  const url = new URL(dbUrl);
  const db = await createConnection({
    host: url.hostname,
    port: Number(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  });

  console.log("🔍 Buscando movimientos duplicados de ventas...\n");

  // Find duplicate movements: same productId + saleId + type='exit' + no batchNumber
  // keeping the first (lower id), marking the second (higher id) as duplicate
  const [duplicates] = await db.query(`
    SELECT im1.id as dup_id, im1.productId as product_id, im1.saleId as sale_id, im1.quantity
    FROM \`inventoryMovements\` im1
    INNER JOIN \`inventoryMovements\` im2
      ON im1.productId = im2.productId
      AND im1.saleId = im2.saleId
      AND im1.type = 'exit'
      AND im2.type = 'exit'
      AND im1.id > im2.id
      AND im1.batchNumber IS NULL
      AND im2.batchNumber IS NULL
    WHERE im1.saleId IS NOT NULL
    ORDER BY im1.saleId, im1.productId
  `) as any[];

  console.log(`Encontrados ${duplicates.length} movimientos duplicados.\n`);

  if (duplicates.length === 0) {
    console.log("✅ No hay duplicados para limpiar.");
    await db.end();
    return;
  }

  // Group by productId to calculate total extra quantity deducted
  const extraByProduct: Record<number, number> = {};
  for (const dup of duplicates) {
    if (!extraByProduct[dup.product_id]) extraByProduct[dup.product_id] = 0;
    extraByProduct[dup.product_id] += dup.quantity;
    console.log(`  - Dup ID=${dup.dup_id} (producto=${dup.product_id}, sale=${dup.sale_id}, qty=${dup.quantity})`);
  }

  // Delete duplicate rows
  const dupIds = duplicates.map((d: any) => d.dup_id);
  await db.query(`DELETE FROM \`inventoryMovements\` WHERE id IN (?)`, [dupIds]);
  console.log(`\n🗑️  Eliminados ${dupIds.length} movimientos duplicados.\n`);

  // Restore extra deducted quantities in inventory
  for (const [productIdStr, extraQty] of Object.entries(extraByProduct)) {
    const productId = Number(productIdStr);
    await db.query(
      `UPDATE \`inventory\` SET quantity = quantity + ?, lastUpdated = NOW() WHERE productId = ?`,
      [extraQty, productId]
    );

    const [[product]] = await db.query(`SELECT name FROM products WHERE id = ?`, [productId]) as any;
    console.log(`✅ Restauradas ${extraQty} unidades → ${product?.name || productId}`);
  }

  console.log("\n✅ Corrección completada exitosamente.");
  await db.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

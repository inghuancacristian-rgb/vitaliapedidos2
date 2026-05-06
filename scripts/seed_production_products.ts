import 'dotenv/config';
import { getDb } from '../server/db';
import { products, inventory } from '../drizzle/schema';
import { eq, like, or } from 'drizzle-orm';

async function seed() {
  const db = await getDb();
  if (!db) {
    console.log("No DB connected.");
    process.exit(1);
  }

  // Verificar Queso
  const existingQueso = await db.select().from(products).where(
    or(like(products.name, '%Queso de Kéfir%'), like(products.name, '%Queso de Kefir%'))
  );

  if (existingQueso.length === 0) {
    const [result] = await db.insert(products).values({
      code: 'QUESO-KEFIR-001',
      name: 'Queso de Kéfir',
      category: 'finished_product',
      price: 0,
      salePrice: 2000, // 20 Bs como ejemplo
    });
    console.log("Creado Queso de Kéfir");
    await db.insert(inventory).values({
      productId: result.insertId,
      quantity: 0,
      minStock: 0,
    });
  } else {
    console.log("Queso de Kéfir ya existe.");
  }

  // Verificar Suero
  const existingSuero = await db.select().from(products).where(
    or(like(products.name, '%Suero de Kéfir%'), like(products.name, '%Suero de Kefir%'))
  );

  if (existingSuero.length === 0) {
    const [result] = await db.insert(products).values({
      code: 'SUERO-KEFIR-001',
      name: 'Suero de Kéfir',
      category: 'finished_product',
      price: 0,
      salePrice: 1000, // 10 Bs como ejemplo
    });
    console.log("Creado Suero de Kéfir");
    await db.insert(inventory).values({
      productId: result.insertId,
      quantity: 0,
      minStock: 0,
    });
  } else {
    console.log("Suero de Kéfir ya existe.");
  }

  console.log("Done");
  process.exit(0);
}

seed();

import { getDb } from './server/db';
import { products } from './drizzle/schema';

async function run() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    return;
  }
  const ps = await db.select().from(products);
  console.log(JSON.stringify(ps, null, 2));
  process.exit(0);
}
run();

import 'dotenv/config';
import { getDb } from '../server/db';
import { cashClosures } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }
  const closures = await db.query.cashClosures.findMany({
    where: and(eq(cashClosures.userId, 2), eq(cashClosures.date, '2026-05-04'))
  });
  console.log(closures);
  process.exit(0);
}
check();

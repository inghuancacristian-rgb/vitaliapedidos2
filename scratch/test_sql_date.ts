
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import { orders } from "../drizzle/schema";

process.env.DATABASE_URL = "mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway";

async function main() {
  const db = await getDb();
  const userId = 13;
  const date = '2026-05-06';

  console.log(`Running query for user ${userId} on date ${date}...`);

  const results = await db.select({
    id: orders.id,
    num: orders.orderNumber,
    deliveredAt: orders.deliveredAt,
    adjustedDate: sql`DATE(DATE_SUB(${orders.deliveredAt}, INTERVAL 4 HOUR))`,
    status: orders.status
  })
  .from(orders)
  .where(sql`${orders.deliveryPersonId} = ${userId} AND ${orders.status} = 'delivered'`);

  console.log("All delivered orders for user 13:");
  console.table(results.map((r: any) => ({
    ...r,
    matches: r.adjustedDate === date
  })));

  process.exit(0);
}

main().catch(console.error);

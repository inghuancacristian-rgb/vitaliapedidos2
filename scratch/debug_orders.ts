
import { getDb, getAllOrders } from "../server/db";
import { getLocalDateKey } from "../server/_core/date_utils";
import "dotenv/config";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB connection");
    process.exit(1);
  }

  console.log("Analyzing recent orders...");
  const orders = await getAllOrders();
  
  // Sort by updatedAt desc to see most recent activity
  const recent = orders.sort((a: any, b: any) => 
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  ).slice(0, 10);

  console.log("Top 10 most recent orders:");
  recent.forEach((o: any) => {
    console.log(`ID: ${o.id}, Num: ${o.orderNumber}, Status: ${o.status}, DeliveredAt: ${o.deliveredAt}, CreatedAt: ${o.createdAt}, Total: ${o.totalPrice}, User: ${o.deliveryPersonId}`);
    if (o.deliveredAt) {
      console.log(`  LocalDateKey (Node): ${getLocalDateKey(o.deliveredAt)}`);
    }
  });

  process.exit(0);
}

main().catch(console.error);

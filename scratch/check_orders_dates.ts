import { getDb } from "../server/db";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function check() {
  const db = await getDb();
  if (!db) {
    console.log("No DB connection");
    return;
  }

  const allDelivered = await db.select().from(orders).where(eq(orders.status, "delivered"));
  console.log(`Total delivered orders: ${allDelivered.length}`);
  
  if (allDelivered.length > 0) {
    console.log("Last 5 delivered orders:");
    allDelivered.slice(-5).forEach(o => {
      console.log(`ID: ${o.id}, CreatedAt: ${o.createdAt}, DeliveredAt: ${o.deliveredAt}, Status: ${o.status}`);
    });
  } else {
    const anyOrders = await db.select().from(orders).limit(5);
    console.log("Any 5 orders in DB:");
    anyOrders.forEach(o => {
      console.log(`ID: ${o.id}, Status: ${o.status}, CreatedAt: ${o.createdAt}`);
    });
  }
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});

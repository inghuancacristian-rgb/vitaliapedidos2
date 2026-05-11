
import { getDb, getAllOrders } from "../server/db";
import { getLocalDateKey } from "../server/_core/date_utils";

// Manually setting the DB URL from .env
process.env.DATABASE_URL = "mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB connection");
    process.exit(1);
  }

  console.log("Database connected. Analyzing recent orders...");
  const orders = await getAllOrders();
  
  const now = new Date();
  console.log("Current Time (UTC):", now.toISOString());

  // Show last 20 orders
  const recent = orders.sort((a: any, b: any) => 
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  ).slice(0, 20);

  console.log("Recent Orders:");
  console.table(recent.map(o => ({
    id: o.id,
    num: o.orderNumber,
    status: o.status,
    method: o.paymentMethod,
    total: o.totalPrice,
    deliveredAt: o.deliveredAt,
    user: o.deliveryPersonId,
    localKey: o.deliveredAt ? getLocalDateKey(o.deliveredAt) : 'N/A'
  })));

  process.exit(0);
}

main().catch(console.error);

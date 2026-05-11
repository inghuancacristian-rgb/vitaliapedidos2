
import { getDb, getAllOrders, getAllUsers } from "../server/db";
import { getLocalDateKey } from "../server/_core/date_utils";

async function main() {
  console.log("Checking deliveries for today...");
  const today = getLocalDateKey(new Date());
  console.log("Today (Bolivia):", today);

  const orders = await getAllOrders();
  const deliveredToday = orders.filter(o => o.status === 'delivered' && getLocalDateKey(o.deliveredAt) === today);

  console.log(`Found ${deliveredToday.length} orders delivered today.`);

  const summaryByUser: Record<string, any> = {};

  for (const o of deliveredToday) {
    const userId = o.deliveryPersonId;
    const userName = o.deliveryPersonName || `User ${userId}`;
    if (!summaryByUser[userId]) {
      summaryByUser[userId] = { name: userName, cash: 0, qr: 0, transfer: 0, count: 0 };
    }
    summaryByUser[userId].count++;
    if (o.paymentMethod === 'cash') summaryByUser[userId].cash += o.totalPrice;
    if (o.paymentMethod === 'qr') summaryByUser[userId].qr += o.totalPrice;
    if (o.paymentMethod === 'transfer') summaryByUser[userId].transfer += o.totalPrice;
  }

  console.log("Summary by user:");
  console.table(summaryByUser);
  
  process.exit(0);
}

main().catch(console.error);

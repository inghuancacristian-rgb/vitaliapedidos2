import mysql from "mysql2/promise";

async function run() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  
  console.log("Adding missing columns to inventory table...");
  try {
    await connection.query("ALTER TABLE inventory ADD COLUMN batchNumber VARCHAR(50) AFTER productId");
    console.log("Added batchNumber to inventory");
  } catch (err: any) {
    console.log("inventory.batchNumber:", err.message);
  }

  console.log("Adding missing columns to inventoryMovements table...");
  try {
    await connection.query("ALTER TABLE inventoryMovements ADD COLUMN batchNumber VARCHAR(50) AFTER saleId");
    console.log("Added batchNumber to inventoryMovements");
  } catch (err: any) {
    console.log("inventoryMovements.batchNumber:", err.message);
  }

  try {
    await connection.query("ALTER TABLE inventoryMovements ADD COLUMN userId INT AFTER notes");
    console.log("Added userId to inventoryMovements");
  } catch (err: any) {
    console.log("inventoryMovements.userId:", err.message);
  }

  try {
    await connection.query("ALTER TABLE inventoryMovements ADD COLUMN orderId INT AFTER userId");
    console.log("Added orderId to inventoryMovements");
  } catch (err: any) {
    console.log("inventoryMovements.orderId:", err.message);
  }

  try {
    await connection.query("ALTER TABLE inventoryMovements ADD COLUMN saleId INT AFTER orderId");
    console.log("Added saleId to inventoryMovements");
  } catch (err: any) {
    console.log("inventoryMovements.saleId:", err.message);
  }

  console.log("Adding missing columns to purchaseItems table...");
  try {
    await connection.query("ALTER TABLE purchaseItems ADD COLUMN batchNumber VARCHAR(50) AFTER price");
    console.log("Added batchNumber to purchaseItems");
  } catch (err: any) {
    console.log("purchaseItems.batchNumber:", err.message);
  }

  try {
    await connection.query("ALTER TABLE purchaseItems ADD COLUMN expiryDate VARCHAR(10) AFTER batchNumber");
    console.log("Added expiryDate to purchaseItems");
  } catch (err: any) {
    console.log("purchaseItems.expiryDate:", err.message);
  }

  await connection.end();
  console.log("Done!");
}

run().catch(console.error);

import { products } from "../drizzle/schema";
import { mysqlTable, int, varchar } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

async function testSQL() {
  const connection = await mysql.createConnection("mysql://fake:fake@fake:3306/fake");
  const db = drizzle(connection);
  
  const data = {
    code: "TEST-123",
    name: "Test",
    category: "finished_product" as const,
    price: 1000,
    salePrice: 1500,
    wholesalePrice: 1200,
    discountPrice: 1000,
    status: "active" as const,
    unit: "unidad",
    presentationQuantity: 1,
    presentationUnit: "unidad",
    presentationVolumeMl: 0,
    presentationWeightGr: 0,
    productionRole: "none" as const,
    storageLocation: null,
    supplierName: null,
    productionNotes: null,
  };

  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  const query = db.insert(products).values(cleanData as any).toSQL();
  console.log("SQL generated:", query.sql);
  console.log("Params generated:", query.params);
  
  await connection.end();
}

testSQL().catch(console.error);

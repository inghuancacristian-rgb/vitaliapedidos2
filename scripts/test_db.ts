import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    return;
  }

  console.log("Connecting to:", url);
  try {
    const connection = await mysql.createConnection(url);
    console.log("Connected successfully!");

    console.log("Describing products table...");
    const [rows] = await connection.query("DESCRIBE products");
    console.log("Columns in products:", rows);

    // Let's also try to execute the exact failed query to get the real error
    console.log("Executing test insert query...");
    try {
      const query = `
        insert into \`products\` (
          \`id\`, \`code\`, \`name\`, \`category\`, \`price\`, \`salePrice\`, 
          \`wholesalePrice\`, \`discountPrice\`, \`unit\`, \`presentationQuantity\`, 
          \`presentationUnit\`, \`presentationVolumeMl\`, \`presentationWeightGr\`, 
          \`productionRole\`, \`storageLocation\`, \`supplierName\`, \`productionNotes\`, 
          \`status\`
        ) values (default, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        "KEF COCO",
        "KEFIR DE COCO 1 LTRO",
        "finished_product",
        2300,
        2800,
        2750,
        0,
        "unidad",
        1,
        "unidad",
        0,
        0,
        "none",
        null,
        null,
        null,
        "active"
      ];
      await connection.query(query, params);
      console.log("Insert succeeded!");
    } catch (err: any) {
      console.error("Query failed with error:", err.message, err.code);
    }

    await connection.end();
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

run();

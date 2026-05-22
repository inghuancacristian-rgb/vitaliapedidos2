import "dotenv/config";
import mysql from "mysql2/promise";

async function testQuery() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    await connection.execute(
      "insert into `products` (`id`, `code`, `name`, `category`, `price`, `salePrice`, `wholesalePrice`, `discountPrice`, `wholesaleDiscountType`, `wholesaleDiscountValue`, `status`, `imageUrl`, `createdAt`, `updatedAt`) values (default, ?, ?, ?, ?, ?, ?, ?, default, default, ?, default, default, default)",
      ["TEST-584", "Producto de Prueba Automático", "finished_product", 1000, 1500, 1200, 1000, "active"]
    );
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await connection.end();
  }
}

testQuery();

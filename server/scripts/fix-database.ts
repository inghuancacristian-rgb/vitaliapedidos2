import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

// Cargar variables de entorno
dotenv.config();

async function runFix() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Error: DATABASE_URL no encontrada en el entorno.");
    process.exit(1);
  }

  console.log("🚀 Iniciando reparación de base de datos...");
  let connection;

  try {
    connection = await mysql.createConnection(connectionString);
    console.log("✅ Conectado a la base de datos.");

    const queries = [
      // 1. Órdenes: Actualizar ENUM y añadir columnas faltantes
      `ALTER TABLE \`orders\` 
       MODIFY COLUMN \`status\` enum('pending','assigned','in_transit','delivered','cancelled','rescheduled') NOT NULL DEFAULT 'pending'`,
      
      `ALTER TABLE \`orders\` ADD COLUMN \`sourceChannel\` enum('facebook','tiktok','marketplace','referral','other') DEFAULT 'other' AFTER \`notes\``,
      `ALTER TABLE \`orders\` ADD COLUMN \`cancelledBy\` enum('client','company','system') AFTER \`sourceChannel\``,
      `ALTER TABLE \`orders\` ADD COLUMN \`cancelReason\` text AFTER \`cancelledBy\``,
      `ALTER TABLE \`orders\` ADD COLUMN \`rescheduleReason\` text AFTER \`cancelReason\``,
      
      `ALTER TABLE \`orders\` ADD COLUMN \`deliveryDate\` varchar(10) AFTER \`rescheduleReason\``,
      `ALTER TABLE \`orders\` ADD COLUMN \`deliveryTime\` varchar(5) AFTER \`deliveryDate\``,
      
      `ALTER TABLE \`orders\` ADD COLUMN \`rescheduleRequested\` int DEFAULT 0 AFTER \`deliveryTime\``,
      `ALTER TABLE \`orders\` ADD COLUMN \`requestedDate\` varchar(10) AFTER \`rescheduleRequested\``,
      `ALTER TABLE \`orders\` ADD COLUMN \`requestedTime\` varchar(5) AFTER \`requestedDate\``,
      `ALTER TABLE \`orders\` ADD COLUMN \`cancellationRequested\` int DEFAULT 0 AFTER \`requestedTime\``,
      `ALTER TABLE \`orders\` ADD COLUMN \`cancellationReason\` text AFTER \`cancellationRequested\``,

      // 2. Clientes
      `ALTER TABLE \`customers\` ADD COLUMN \`sourceChannel\` enum('facebook','tiktok','marketplace','referral','other') DEFAULT 'other' AFTER \`socioeconomicLevel\``,

      // 3. Productos: Precios y Descuentos
      `ALTER TABLE \`products\` ADD COLUMN \`salePrice\` int NOT NULL DEFAULT 0 AFTER \`price\``,
      `ALTER TABLE \`products\` ADD COLUMN \`wholesalePrice\` int NOT NULL DEFAULT 0 AFTER \`salePrice\``,
      `ALTER TABLE \`products\` ADD COLUMN \`discountPrice\` int NOT NULL DEFAULT 0 AFTER \`wholesalePrice\``,
      `ALTER TABLE \`products\` ADD COLUMN \`wholesaleDiscountType\` enum('percentage','fixed') DEFAULT 'percentage' AFTER \`discountPrice\``,
      `ALTER TABLE \`products\` ADD COLUMN \`wholesaleDiscountValue\` int NOT NULL DEFAULT 0 AFTER \`wholesaleDiscountType\``,

      // 4. Inventario
      `ALTER TABLE \`inventory\` ADD COLUMN \`expiryDate\` varchar(10) AFTER \`minStock\``,

      // 5. Movimientos de Inventario
      `ALTER TABLE \`inventoryMovements\` ADD COLUMN \`userId\` int AFTER \`notes\``,
      `ALTER TABLE \`inventoryMovements\` ADD COLUMN \`orderId\` int AFTER \`userId\``,
      `ALTER TABLE \`inventoryMovements\` ADD COLUMN \`saleId\` int AFTER \`orderId\``,

      // 6. Items con Triple Precio
      `ALTER TABLE \`orderItems\` ADD COLUMN \`pricingType\` enum('unit','wholesale','discount') NOT NULL DEFAULT 'unit' AFTER \`productId\``,
      `ALTER TABLE \`saleItems\` MODIFY COLUMN \`pricingType\` enum('unit','wholesale','discount') NOT NULL DEFAULT 'unit'`,
      `ALTER TABLE \`quotationItems\` MODIFY COLUMN \`pricingType\` enum('unit','wholesale','discount') NOT NULL DEFAULT 'unit'`,
    ];

    for (const query of queries) {
      try {
        console.log(`⏳ Ejecutando: ${query.substring(0, 50)}...`);
        // IF NOT EXISTS no es nativo en ALTER TABLE de MySQL < 8.0.19, pero usamos try-catch para ignorar errores de "columna duplicada"
        await connection.query(query);
      } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_COLUMN_NAME') {
          console.log("ℹ️ La columna ya existe, saltando.");
        } else {
          console.warn("⚠️ Error en consulta:", e.message);
        }
      }
    }

    // Intentar añadir llaves foráneas para movimientos
    const fks = [
      `ALTER TABLE \`inventoryMovements\` ADD CONSTRAINT \`inventoryMovements_userId_users_id_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)`,
      `ALTER TABLE \`inventoryMovements\` ADD CONSTRAINT \`inventoryMovements_orderId_orders_id_fk\` FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`)`,
      `ALTER TABLE \`inventoryMovements\` ADD CONSTRAINT \`inventoryMovements_saleId_sales_id_fk\` FOREIGN KEY (\`saleId\`) REFERENCES \`sales\`(\`id\`)`,
    ];

    for (const fk of fks) {
      try {
        await connection.query(fk);
      } catch (e) {
        // Ignorar si ya existe
      }
    }

    console.log("✅ Base de datos sincronizada con éxito.");
  } catch (error: any) {
    console.error("❌ Error fatal:", error.message);
  } finally {
    if (connection) await connection.end();
  }
}

runFix();

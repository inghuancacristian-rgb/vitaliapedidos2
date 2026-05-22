import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

async function ensureTables() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  console.log("[EnsureTables] Connecting to database...");
  const connection = await mysql.createConnection(databaseUrl);

  try {
    // ---- cash_openings table ----
    console.log("[EnsureTables] Checking cash_openings table...");
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cash_openings (
          id int AUTO_INCREMENT NOT NULL,
          openingDate varchar(10) NOT NULL,
          openingAmount int NOT NULL DEFAULT 0,
          paymentMethod enum('cash','qr','transfer') DEFAULT 'cash',
          responsibleUserId int NOT NULL,
          openedByUserId int NOT NULL,
          status enum('open','closed') NOT NULL DEFAULT 'open',
          notes text,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT cash_openings_id PRIMARY KEY(id)
        )
      `);
      console.log("[EnsureTables] cash_openings table OK");
    } catch (err: any) {
      console.log("[EnsureTables] cash_openings create:", err.message);
    }

    // Add paymentMethod column if it doesn't exist (for existing tables)
    try {
      await connection.query(`
        ALTER TABLE cash_openings ADD COLUMN paymentMethod enum('cash','qr','transfer') DEFAULT 'cash' AFTER openingAmount
      `);
      console.log("[EnsureTables] Added paymentMethod column to cash_openings");
    } catch (err: any) {
      if (err.message.includes("Duplicate column")) {
        console.log("[EnsureTables] cash_openings.paymentMethod already exists");
      } else {
        console.log("[EnsureTables] cash_openings.paymentMethod:", err.message);
      }
    }

    // Add foreign keys if they don't exist
    try {
      await connection.query(`
        ALTER TABLE cash_openings
          ADD CONSTRAINT cash_openings_responsibleUserId_users_id_fk
          FOREIGN KEY (responsibleUserId) REFERENCES users(id)
          ON DELETE no action ON UPDATE no action
      `);
      console.log("[EnsureTables] Added responsibleUserId FK");
    } catch (err: any) {
      if (err.message.includes("Duplicate") || err.message.includes("already exists")) {
        console.log("[EnsureTables] responsibleUserId FK already exists");
      } else {
        console.log("[EnsureTables] responsibleUserId FK:", err.message);
      }
    }

    try {
      await connection.query(`
        ALTER TABLE cash_openings
          ADD CONSTRAINT cash_openings_openedByUserId_users_id_fk
          FOREIGN KEY (openedByUserId) REFERENCES users(id)
          ON DELETE no action ON UPDATE no action
      `);
      console.log("[EnsureTables] Added openedByUserId FK");
    } catch (err: any) {
      if (err.message.includes("Duplicate") || err.message.includes("already exists")) {
        console.log("[EnsureTables] openedByUserId FK already exists");
      } else {
        console.log("[EnsureTables] openedByUserId FK:", err.message);
      }
    }

    // ---- auditLog table ----
    console.log("[EnsureTables] Checking auditLog table...");
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS auditLog (
          id int AUTO_INCREMENT NOT NULL,
          entityType varchar(100) NOT NULL,
          entityId int NOT NULL,
          action enum('CREATE','UPDATE','DELETE') NOT NULL,
          userId int,
          oldValues text,
          newValues text,
          description text,
          ipAddress varchar(45),
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT auditLog_id PRIMARY KEY(id)
        )
      `);
      console.log("[EnsureTables] auditLog table OK");
    } catch (err: any) {
      console.log("[EnsureTables] auditLog create:", err.message);
    }

    // ---- delivery_extra_load table ----
    console.log("[EnsureTables] Checking delivery_extra_load table...");
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS delivery_extra_load (
          id int AUTO_INCREMENT NOT NULL,
          deliveryPersonId int NOT NULL,
          productId int NOT NULL,
          quantity int NOT NULL,
          type enum('sale','sample') NOT NULL DEFAULT 'sale',
          status enum('loaded','sold','used','returned') NOT NULL DEFAULT 'loaded',
          date varchar(10) NOT NULL,
          notes text,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT delivery_extra_load_id PRIMARY KEY(id)
        )
      `);
      console.log("[EnsureTables] delivery_extra_load table OK");
    } catch (err: any) {
      console.log("[EnsureTables] delivery_extra_load create:", err.message);
    }

    // ---- production_batches table ----
    console.log("[EnsureTables] Checking production_batches table...");
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS production_batches (
          id int AUTO_INCREMENT NOT NULL,
          batchNumber varchar(50) NOT NULL UNIQUE,
          type enum('kefir_production','nodule_washing','maintenance') NOT NULL,
          status enum('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
          startDate timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          endDate timestamp NULL,
          registeredBy int NOT NULL,
          notes text,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT production_batches_id PRIMARY KEY(id)
        )
      `);
      console.log("[EnsureTables] production_batches table OK");
    } catch (err: any) {
      console.log("[EnsureTables] production_batches create:", err.message);
    }

    // ---- production_outputs table ----
    console.log("[EnsureTables] Checking production_outputs table...");
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS production_outputs (
          id int AUTO_INCREMENT NOT NULL,
          batchId int NOT NULL,
          productId int NOT NULL,
          quantity int NOT NULL,
          expectedQuantity int,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT production_outputs_id PRIMARY KEY(id)
        )
      `);
      console.log("[EnsureTables] production_outputs table OK");
    } catch (err: any) {
      console.log("[EnsureTables] production_outputs create:", err.message);
    }

    // ---- quotations table ----
    console.log("[EnsureTables] Checking quotations table...");
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS quotations (
          id int AUTO_INCREMENT NOT NULL,
          quotationNumber varchar(50) NOT NULL UNIQUE,
          customerId int,
          customerName varchar(255),
          status enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
          subtotal int NOT NULL,
          discountType enum('none','percentage','fixed') NOT NULL DEFAULT 'none',
          discountValue int NOT NULL DEFAULT 0,
          discountAmount int NOT NULL DEFAULT 0,
          total int NOT NULL,
          validUntil timestamp NULL,
          notes text,
          termsAndConditions text,
          createdBy int NOT NULL,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT quotations_id PRIMARY KEY(id)
        )
      `);
      console.log("[EnsureTables] quotations table OK");
    } catch (err: any) {
      console.log("[EnsureTables] quotations create:", err.message);
    }

    // ---- quotationItems table ----
    console.log("[EnsureTables] Checking quotationItems table...");
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS quotationItems (
          id int AUTO_INCREMENT NOT NULL,
          quotationId int NOT NULL,
          productId int NOT NULL,
          pricingType enum('unit','wholesale','discount') NOT NULL DEFAULT 'unit',
          quantity int NOT NULL,
          basePrice int NOT NULL,
          discountType enum('none','percentage','fixed') NOT NULL DEFAULT 'none',
          discountValue int NOT NULL DEFAULT 0,
          discountAmount int NOT NULL DEFAULT 0,
          finalUnitPrice int NOT NULL DEFAULT 0,
          subtotal int NOT NULL,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT quotationItems_id PRIMARY KEY(id)
        )
      `);
      console.log("[EnsureTables] quotationItems table OK");
    } catch (err: any) {
      console.log("[EnsureTables] quotationItems create:", err.message);
    }

    console.log("[EnsureTables] All tables verified successfully!");
  } finally {
    await connection.end();
  }
}

ensureTables().catch((error) => {
  console.error("[EnsureTables] Failed:", error);
  process.exit(1);
});

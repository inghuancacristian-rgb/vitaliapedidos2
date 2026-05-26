CREATE TABLE `accountsPayable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseId` int NOT NULL,
	`amount` int NOT NULL,
	`dueDate` timestamp,
	`status` enum('unpaid','partially_paid','paid') NOT NULL DEFAULT 'unpaid',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountsPayable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('CREATE','UPDATE','DELETE') NOT NULL,
	`userId` int,
	`oldValues` text,
	`newValues` text,
	`description` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_closures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`initialCash` int DEFAULT 0,
	`reportedCash` int DEFAULT 0,
	`reportedQr` int DEFAULT 0,
	`reportedTransfer` int DEFAULT 0,
	`expectedCash` int DEFAULT 0,
	`expectedQr` int DEFAULT 0,
	`expectedTransfer` int DEFAULT 0,
	`expenses` int DEFAULT 0,
	`pendingOrders` int DEFAULT 0,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_closures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_openings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openingDate` varchar(10) NOT NULL,
	`openingAmount` int NOT NULL DEFAULT 0,
	`paymentMethod` enum('cash','qr','transfer') DEFAULT 'cash',
	`responsibleUserId` int NOT NULL,
	`openedByUserId` int NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_openings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientNumber` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`whatsapp` varchar(20),
	`zone` varchar(100),
	`address` text,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`age` int,
	`gender` varchar(30),
	`socioeconomicLevel` varchar(50),
	`sourceChannel` enum('facebook','tiktok','marketplace','referral','other') DEFAULT 'other',
	`customerType` enum('retail','wholesale') NOT NULL DEFAULT 'retail',
	`interestHealthFitness` int NOT NULL DEFAULT 0,
	`interestNaturalFood` int NOT NULL DEFAULT 0,
	`interestDigestiveIssues` int NOT NULL DEFAULT 0,
	`lifestyleGym` int NOT NULL DEFAULT 0,
	`lifestyleVegan` int NOT NULL DEFAULT 0,
	`lifestyleBiohacking` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_clientNumber_unique` UNIQUE(`clientNumber`)
);
--> statement-breakpoint
CREATE TABLE `deliveryExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryPersonId` int NOT NULL,
	`orderId` int,
	`amount` int NOT NULL,
	`type` enum('fuel','subsistence','other') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_extra_load` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryPersonId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`type` enum('sale','sample') NOT NULL DEFAULT 'sale',
	`status` enum('loaded','sold','used','returned') NOT NULL DEFAULT 'loaded',
	`date` varchar(10) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_extra_load_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financialTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`category` varchar(100) NOT NULL,
	`paymentMethod` enum('cash','qr','transfer') DEFAULT 'cash',
	`amount` int NOT NULL,
	`userId` int,
	`referenceId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financialTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gpsTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`deliveryPersonId` int NOT NULL,
	`latitude` varchar(50) NOT NULL,
	`longitude` varchar(50) NOT NULL,
	`accuracy` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gpsTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`batchNumber` varchar(50),
	`quantity` int NOT NULL DEFAULT 0,
	`minStock` int NOT NULL DEFAULT 10,
	`expiryDate` varchar(10),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`type` enum('entry','exit','adjustment') NOT NULL,
	`quantity` int NOT NULL,
	`reason` varchar(255),
	`notes` text,
	`userId` int,
	`orderId` int,
	`saleId` int,
	`batchNumber` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transfer_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`productName` varchar(255),
	`productUnit` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_transfer_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferNumber` varchar(50) NOT NULL,
	`direction` enum('to_production','to_general') NOT NULL,
	`status` enum('completed','cancelled') NOT NULL DEFAULT 'completed',
	`userId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_transfers_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_transfers_transferNumber_unique` UNIQUE(`transferNumber`)
);
--> statement-breakpoint
CREATE TABLE `operationalExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`description` varchar(255) NOT NULL,
	`category` enum('facebook_ads','google_ads','electricity','water','internet','telephone','rent','salaries','maintenance','supplies','taxes','insurance','bank_fees','other') NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('cash','qr','transfer') NOT NULL,
	`expenseDate` timestamp NOT NULL DEFAULT (now()),
	`dueDate` timestamp,
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`supplierName` varchar(255),
	`invoiceNumber` varchar(100),
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operationalExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`pricingType` enum('unit','wholesale','discount') NOT NULL DEFAULT 'unit',
	`quantity` int NOT NULL,
	`price` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`customerId` int NOT NULL,
	`deliveryPersonId` int,
	`zone` varchar(100),
	`status` enum('pending','assigned','in_transit','delivered','cancelled','rescheduled') NOT NULL DEFAULT 'pending',
	`totalPrice` int NOT NULL,
	`paymentMethod` enum('qr','cash','transfer'),
	`paymentStatus` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`sourceChannel` enum('facebook','tiktok','marketplace','referral','other') DEFAULT 'other',
	`cancelledBy` enum('client','company','system'),
	`cancelReason` text,
	`rescheduleReason` text,
	`deliveryDate` varchar(10),
	`deliveryTime` varchar(5),
	`rescheduleRequested` int DEFAULT 0,
	`requestedDate` varchar(10),
	`requestedTime` varchar(5),
	`cancellationRequested` int DEFAULT 0,
	`cancellationReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deliveredAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`amount` int NOT NULL,
	`method` enum('qr','cash','transfer') NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`reference` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchNumber` varchar(50) NOT NULL,
	`type` enum('kefir_production','nodule_washing','maintenance') NOT NULL,
	`status` enum('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`endDate` timestamp,
	`registeredBy` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_batches_batchNumber_unique` UNIQUE(`batchNumber`)
);
--> statement-breakpoint
CREATE TABLE `production_outputs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`expectedQuantity` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `production_outputs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('finished_product','raw_material','supplies','insumo') NOT NULL DEFAULT 'finished_product',
	`price` int NOT NULL,
	`salePrice` int NOT NULL DEFAULT 0,
	`wholesalePrice` int NOT NULL DEFAULT 0,
	`discountPrice` int NOT NULL DEFAULT 0,
	`wholesaleDiscountType` enum('percentage','fixed') DEFAULT 'percentage',
	`wholesaleDiscountValue` int NOT NULL DEFAULT 0,
	`unit` varchar(20) NOT NULL DEFAULT 'unidad',
	`presentationQuantity` int NOT NULL DEFAULT 1,
	`presentationUnit` varchar(20) NOT NULL DEFAULT 'unidad',
	`presentationVolumeMl` int NOT NULL DEFAULT 0,
	`presentationWeightGr` int NOT NULL DEFAULT 0,
	`productionRole` enum('none','milk','sugar','culture','bottle','cap','label','packaging','finished_good','other') NOT NULL DEFAULT 'none',
	`storageLocation` varchar(100),
	`supplierName` varchar(255),
	`productionNotes` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`imageUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `purchaseItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`price` int NOT NULL,
	`batchNumber` varchar(50),
	`expiryDate` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchaseItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`purchaseNumber` varchar(50) NOT NULL,
	`orderDate` timestamp NOT NULL DEFAULT (now()),
	`totalAmount` int NOT NULL,
	`status` enum('pending','received','cancelled') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`paymentMethod` enum('cash','qr','transfer') DEFAULT 'cash',
	`isCredit` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchases_purchaseNumber_unique` UNIQUE(`purchaseNumber`)
);
--> statement-breakpoint
CREATE TABLE `quotationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`productId` int NOT NULL,
	`pricingType` enum('unit','wholesale','discount') NOT NULL DEFAULT 'unit',
	`quantity` int NOT NULL,
	`basePrice` int NOT NULL,
	`discountType` enum('none','percentage','fixed') NOT NULL DEFAULT 'none',
	`discountValue` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`finalUnitPrice` int NOT NULL DEFAULT 0,
	`subtotal` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotationItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationNumber` varchar(50) NOT NULL,
	`customerId` int,
	`customerName` varchar(255),
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`subtotal` int NOT NULL,
	`discountType` enum('none','percentage','fixed') NOT NULL DEFAULT 'none',
	`discountValue` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`validUntil` timestamp,
	`notes` text,
	`termsAndConditions` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_quotationNumber_unique` UNIQUE(`quotationNumber`)
);
--> statement-breakpoint
CREATE TABLE `saleItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`pricingType` enum('unit','wholesale','discount') NOT NULL DEFAULT 'unit',
	`quantity` int NOT NULL,
	`basePrice` int NOT NULL,
	`discountType` enum('none','percentage','fixed') NOT NULL DEFAULT 'none',
	`discountValue` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`finalUnitPrice` int NOT NULL DEFAULT 0,
	`subtotal` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saleItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleNumber` varchar(50) NOT NULL,
	`customerId` int,
	`customerName` varchar(255),
	`saleChannel` enum('local','delivery') NOT NULL DEFAULT 'local',
	`status` enum('completed','cancelled') NOT NULL DEFAULT 'completed',
	`orderId` int,
	`soldBy` int NOT NULL,
	`subtotal` int NOT NULL,
	`discountType` enum('none','percentage','fixed') NOT NULL DEFAULT 'none',
	`discountValue` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`paymentMethod` enum('cash','qr','transfer') NOT NULL,
	`paymentStatus` enum('pending','completed') NOT NULL DEFAULT 'completed',
	`notes` text,
	`cancelReason` text,
	`cancelledAt` timestamp,
	`cancelledBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_saleNumber_unique` UNIQUE(`saleNumber`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(255) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`phone` varchar(20),
	`taxId` varchar(50),
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL DEFAULT '',
	`username` varchar(100),
	`passwordHash` text,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `accountsPayable` ADD CONSTRAINT `accountsPayable_purchaseId_purchases_id_fk` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditLog` ADD CONSTRAINT `auditLog_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_closures` ADD CONSTRAINT `cash_closures_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_openings` ADD CONSTRAINT `cash_openings_responsibleUserId_users_id_fk` FOREIGN KEY (`responsibleUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_openings` ADD CONSTRAINT `cash_openings_openedByUserId_users_id_fk` FOREIGN KEY (`openedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveryExpenses` ADD CONSTRAINT `deliveryExpenses_deliveryPersonId_users_id_fk` FOREIGN KEY (`deliveryPersonId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveryExpenses` ADD CONSTRAINT `deliveryExpenses_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_extra_load` ADD CONSTRAINT `delivery_extra_load_deliveryPersonId_users_id_fk` FOREIGN KEY (`deliveryPersonId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_extra_load` ADD CONSTRAINT `delivery_extra_load_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD CONSTRAINT `financialTransactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gpsTracking` ADD CONSTRAINT `gpsTracking_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gpsTracking` ADD CONSTRAINT `gpsTracking_deliveryPersonId_users_id_fk` FOREIGN KEY (`deliveryPersonId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transfer_items` ADD CONSTRAINT `inventory_transfer_items_transferId_inventory_transfers_id_fk` FOREIGN KEY (`transferId`) REFERENCES `inventory_transfers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transfer_items` ADD CONSTRAINT `inventory_transfer_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operationalExpenses` ADD CONSTRAINT `operationalExpenses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderItems` ADD CONSTRAINT `orderItems_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderItems` ADD CONSTRAINT `orderItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_deliveryPersonId_users_id_fk` FOREIGN KEY (`deliveryPersonId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_registeredBy_users_id_fk` FOREIGN KEY (`registeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_outputs` ADD CONSTRAINT `production_outputs_batchId_production_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `production_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_outputs` ADD CONSTRAINT `production_outputs_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseItems` ADD CONSTRAINT `purchaseItems_purchaseId_purchases_id_fk` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseItems` ADD CONSTRAINT `purchaseItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotationItems` ADD CONSTRAINT `quotationItems_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotationItems` ADD CONSTRAINT `quotationItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleItems` ADD CONSTRAINT `saleItems_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleItems` ADD CONSTRAINT `saleItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_soldBy_users_id_fk` FOREIGN KEY (`soldBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_cancelledBy_users_id_fk` FOREIGN KEY (`cancelledBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
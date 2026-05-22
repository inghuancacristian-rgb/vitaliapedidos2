ALTER TABLE `products` ADD `unit` varchar(20) NOT NULL DEFAULT 'unidad';--> statement-breakpoint
ALTER TABLE `products` ADD `presentationQuantity` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `products` ADD `presentationUnit` varchar(20) NOT NULL DEFAULT 'unidad';--> statement-breakpoint
ALTER TABLE `products` ADD `presentationVolumeMl` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `presentationWeightGr` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `productionRole` enum('none','milk','sugar','culture','bottle','cap','label','packaging','finished_good','other') NOT NULL DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `products` ADD `storageLocation` varchar(100);--> statement-breakpoint
ALTER TABLE `products` ADD `supplierName` varchar(255);--> statement-breakpoint
ALTER TABLE `products` ADD `productionNotes` text;

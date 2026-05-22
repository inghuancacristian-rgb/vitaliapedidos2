ALTER TABLE `cash_openings`
  ADD COLUMN `paymentMethod` enum('cash','qr','transfer') DEFAULT 'cash' AFTER `openingAmount`;

UPDATE `cash_openings`
SET `paymentMethod` = 'cash'
WHERE `paymentMethod` IS NULL;

ALTER TABLE `cash_openings`
  MODIFY COLUMN `paymentMethod` enum('cash','qr','transfer') NOT NULL DEFAULT 'cash';

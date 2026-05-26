CREATE TABLE inventory_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transferNumber VARCHAR(50) NOT NULL UNIQUE,
  direction ENUM('to_production', 'to_general') NOT NULL,
  status ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  userId INT NOT NULL REFERENCES users(id),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE inventory_transfer_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transferId INT NOT NULL REFERENCES inventory_transfers(id),
  productId INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  productName VARCHAR(255),
  productUnit VARCHAR(20),
  createdAt TIMESTAMP DEFAULT NOW() NOT NULL
);

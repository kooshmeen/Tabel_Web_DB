CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Stored hashed password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) DEFAULT 'user' -- Default role is 'user', can be 'admin' or 'user'
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00; -- Adding balance column to users table

SELECT * FROM users;

-- Create table for storing items owned by users
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_description TEXT,
    item_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM items;

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

SELECT * FROM orders;

-- Add sample data to items table
INSERT INTO items (user_id, item_name, item_description, item_price, quantity)
VALUES
    (1, 'Sample Item 1', 'This is a sample item description.', 19.99, 10),
    (1, 'Sample Item 2', 'This is another sample item description.', 29.99, 5),
    (2, 'Sample Item 3', 'This is a third sample item description.', 39.99, 2);

-- Add sample data to orders table

INSERT INTO orders (user_id, item_id, quantity, total_price)
VALUES
    (1, 1, 2, 39.98), -- User 1 ordered 2 of Item 1
    (1, 2, 1, 29.99), -- User 1 ordered 1 of Item 2
    (2, 3, 1, 39.99); -- User 2 ordered 1 of Item 3


-- Add more sample data to items and orders tables to test pagination
-- Sample data for items table
INSERT INTO items (user_id, item_name, item_description, item_price, quantity) VALUES
-- User 4 items
(4, 'Laptop Toshiba', '8GB RAM, 256GB SSD', 799.99, 3),
(4, 'Wireless Mouse', 'Ergonomic design, USB receiver', 29.99, 2),
(4, 'USB-C Hub', '7-in-1 multiport adapter', 49.99, 1),

-- User 5 items
(5, 'Gaming Keyboard', 'RGB mechanical switches', 129.99, 1),
(5, 'Monitor 24"', '1080p IPS display', 199.99, 2),
(5, 'Webcam HD', '1080p streaming camera', 79.99, 1),
(5, 'Desk Lamp', 'LED adjustable brightness', 34.99, 1),

-- User 6 items
(6, 'Smartphone', '128GB, dual camera', 599.99, 1),
(6, 'Phone Case', 'Protective silicone case', 19.99, 3),
(6, 'Wireless Charger', 'Fast charging pad', 39.99, 1),

-- User 7 items
(7, 'Tablet', '10.1" Android tablet', 249.99, 1),
(7, 'Bluetooth Speaker', 'Portable waterproof speaker', 69.99, 2),
(7, 'Power Bank', '20000mAh portable charger', 44.99, 1),
(7, 'Headphones', 'Noise cancelling over-ear', 149.99, 1),

-- User 8 items
(8, 'Coffee Maker', 'Programmable drip coffee maker', 89.99, 1),
(8, 'Travel Mug', 'Insulated stainless steel', 24.99, 2),
(8, 'Book Stand', 'Adjustable reading stand', 29.99, 1),

-- User 9 items
(9, 'Fitness Watch', 'Heart rate monitor, GPS', 199.99, 1),
(9, 'Yoga Mat', 'Non-slip exercise mat', 39.99, 1),
(9, 'Water Bottle', 'BPA-free 32oz bottle', 19.99, 2),
(9, 'Protein Shaker', 'Leak-proof mixing bottle', 14.99, 3);

SELECT id, item_name FROM items;

-- Sample data for orders table
INSERT INTO orders (user_id, item_id, quantity, total_price) VALUES
-- User 4 orders
(4, 5, 1, 799.99),   -- Laptop Toshiba
(4, 7, 2, 59.98),    -- 2 Wireless Mice
(4, 8, 1, 49.99),    -- USB-C Hub

-- User 5 orders
(5, 9, 1, 129.99),   -- Gaming Keyboard
(5, 10, 1, 199.99),  -- Monitor 24"
(5, 11, 1, 79.99),   -- Webcam HD

-- User 6 orders
(6, 13, 1, 599.99),  -- Smartphone
(6, 14, 2, 39.98),   -- 2 Phone Cases
(6, 15, 1, 39.99),   -- Wireless Charger

-- User 7 orders
(7, 16, 1, 249.99),  -- Tablet
(7, 17, 1, 69.99),   -- Bluetooth Speaker
(7, 19, 1, 149.99),  -- Headphones

-- User 8 orders
(8, 20, 1, 89.99),   -- Coffee Maker
(8, 21, 1, 24.99),   -- Travel Mug
(8, 22, 1, 29.99),   -- Book Stand

-- User 9 orders
(9, 23, 1, 199.99),  -- Fitness Watch
(9, 24, 1, 39.99),   -- Yoga Mat
(9, 25, 1, 19.99),   -- Water Bottle
(9, 26, 2, 29.98);   -- 2 Protein Shakers
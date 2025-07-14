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
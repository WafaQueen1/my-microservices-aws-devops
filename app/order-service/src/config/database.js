const mysql = require("mysql2/promise");
const logger = require("../utils/logger");

// Database configuration
const dbConfig = {
	host: process.env.DB_HOST || "localhost",
	port: process.env.DB_PORT || 3306,
	user: process.env.DB_USER || "admin",
	password: process.env.DB_PASSWORD || "password",
	database: process.env.DB_NAME || "ecommerce_db",
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
	try {
		const connection = await pool.getConnection();
		logger.info("Database connection successful");
		connection.release();
		return true;
	} catch (error) {
		logger.error("Database connection failed:", error.message);
		throw error;
	}
};

// Initialize database tables
const initializeTables = async () => {
	const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(36) PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      shipping_address TEXT NOT NULL,
      status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
      total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

	const createOrderItemsTable = `
    CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      product_id VARCHAR(36) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `;

	try {
		await pool.execute(createOrdersTable);
		logger.info("Orders table initialized");

		await pool.execute(createOrderItemsTable);
		logger.info("Order items table initialized");
	} catch (error) {
		logger.error("Failed to initialize tables:", error.message);
		throw error;
	}
};

module.exports = {
	pool,
	testConnection,
	initializeTables,
};

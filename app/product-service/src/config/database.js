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
	const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      stock INT DEFAULT 0,
      category VARCHAR(100),
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

	try {
		await pool.execute(createProductsTable);
		logger.info("Products table initialized");

		// Insert sample data if table is empty
		const [rows] = await pool.execute("SELECT COUNT(*) as count FROM products");
		if (rows[0].count === 0) {
			await insertSampleData();
		}
	} catch (error) {
		logger.error("Failed to initialize tables:", error.message);
		throw error;
	}
};

// Insert sample product data
const insertSampleData = async () => {
	const sampleProducts = [
		{
			id: "prod-001",
			name: "Wireless Headphones",
			description: "High-quality wireless headphones with noise cancellation",
			price: 99.99,
			stock: 50,
			category: "Electronics",
			image_url: "https://example.com/headphones.jpg",
		},
		{
			id: "prod-002",
			name: "Smart Watch",
			description: "Feature-rich smartwatch with health monitoring",
			price: 199.99,
			stock: 30,
			category: "Electronics",
			image_url: "https://example.com/watch.jpg",
		},
		{
			id: "prod-003",
			name: "Laptop Stand",
			description: "Ergonomic aluminum laptop stand",
			price: 49.99,
			stock: 100,
			category: "Accessories",
			image_url: "https://example.com/stand.jpg",
		},
		{
			id: "prod-004",
			name: "USB-C Hub",
			description: "7-in-1 USB-C hub with HDMI and card reader",
			price: 39.99,
			stock: 75,
			category: "Accessories",
			image_url: "https://example.com/hub.jpg",
		},
		{
			id: "prod-005",
			name: "Mechanical Keyboard",
			description: "RGB mechanical keyboard with Cherry MX switches",
			price: 129.99,
			stock: 40,
			category: "Electronics",
			image_url: "https://example.com/keyboard.jpg",
		},
	];

	const insertQuery = `
    INSERT INTO products (id, name, description, price, stock, category, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

	for (const product of sampleProducts) {
		await pool.execute(insertQuery, [
			product.id,
			product.name,
			product.description,
			product.price,
			product.stock,
			product.category,
			product.image_url,
		]);
	}

	logger.info("Sample product data inserted");
};

module.exports = {
	pool,
	testConnection,
	initializeTables,
};

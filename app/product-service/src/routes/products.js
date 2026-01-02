const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/database");
const logger = require("../utils/logger");

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	next();
};

// GET all products with optional filtering and pagination
router.get(
	"/",
	[
		query("page").optional().isInt({ min: 1 }),
		query("limit").optional().isInt({ min: 1, max: 100 }),
		query("category").optional().isString(),
		query("minPrice").optional().isFloat({ min: 0 }),
		query("maxPrice").optional().isFloat({ min: 0 }),
	],
	validate,
	async (req, res) => {
		try {
			const page = parseInt(req.query.page) || 1;
			const limit = parseInt(req.query.limit) || 10;
			const offset = (page - 1) * limit;
			const { category, minPrice, maxPrice } = req.query;

			let whereClause = "WHERE 1=1";
			const params = [];

			if (category) {
				whereClause += " AND category = ?";
				params.push(category);
			}
			if (minPrice) {
				whereClause += " AND price >= ?";
				params.push(parseFloat(minPrice));
			}
			if (maxPrice) {
				whereClause += " AND price <= ?";
				params.push(parseFloat(maxPrice));
			}

			// Get total count
			const [countResult] = await pool.execute(
				`SELECT COUNT(*) as total FROM products ${whereClause}`,
				params
			);
			const total = countResult[0].total;

			// Get products
			const [products] = await pool.execute(
				`SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT ${parseInt(
					limit
				)} OFFSET ${parseInt(offset)}`,
				params
			);

			res.json({
				data: products,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			logger.error("Error fetching products:", error);
			res.status(500).json({ error: "Failed to fetch products" });
		}
	}
);

// GET single product by ID
router.get(
	"/:id",
	[param("id").isString().notEmpty()],
	validate,
	async (req, res) => {
		try {
			const [products] = await pool.execute(
				"SELECT * FROM products WHERE id = ?",
				[req.params.id]
			);

			if (products.length === 0) {
				return res.status(404).json({ error: "Product not found" });
			}

			res.json(products[0]);
		} catch (error) {
			logger.error("Error fetching product:", error);
			res.status(500).json({ error: "Failed to fetch product" });
		}
	}
);

// POST create new product
router.post(
	"/",
	[
		body("name").isString().notEmpty().trim(),
		body("description").optional().isString(),
		body("price").isFloat({ min: 0 }),
		body("stock").optional().isInt({ min: 0 }),
		body("category").optional().isString(),
		body("image_url").optional().isURL(),
	],
	validate,
	async (req, res) => {
		try {
			const { name, description, price, stock, category, image_url } = req.body;
			const id = uuidv4();

			await pool.execute(
				`INSERT INTO products (id, name, description, price, stock, category, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					id,
					name,
					description || null,
					price,
					stock || 0,
					category || null,
					image_url || null,
				]
			);

			const [newProduct] = await pool.execute(
				"SELECT * FROM products WHERE id = ?",
				[id]
			);

			logger.info(`Product created: ${id}`);
			res.status(201).json(newProduct[0]);
		} catch (error) {
			logger.error("Error creating product:", error);
			res.status(500).json({ error: "Failed to create product" });
		}
	}
);

// PUT update product
router.put(
	"/:id",
	[
		param("id").isString().notEmpty(),
		body("name").optional().isString().notEmpty().trim(),
		body("description").optional().isString(),
		body("price").optional().isFloat({ min: 0 }),
		body("stock").optional().isInt({ min: 0 }),
		body("category").optional().isString(),
		body("image_url").optional().isURL(),
	],
	validate,
	async (req, res) => {
		try {
			const { id } = req.params;
			const updates = req.body;

			// Check if product exists
			const [existing] = await pool.execute(
				"SELECT * FROM products WHERE id = ?",
				[id]
			);

			if (existing.length === 0) {
				return res.status(404).json({ error: "Product not found" });
			}

			// Build update query dynamically
			const fields = Object.keys(updates);
			if (fields.length === 0) {
				return res.status(400).json({ error: "No fields to update" });
			}

			const setClause = fields.map((field) => `${field} = ?`).join(", ");
			const values = fields.map((field) => updates[field]);

			await pool.execute(`UPDATE products SET ${setClause} WHERE id = ?`, [
				...values,
				id,
			]);

			const [updatedProduct] = await pool.execute(
				"SELECT * FROM products WHERE id = ?",
				[id]
			);

			logger.info(`Product updated: ${id}`);
			res.json(updatedProduct[0]);
		} catch (error) {
			logger.error("Error updating product:", error);
			res.status(500).json({ error: "Failed to update product" });
		}
	}
);

// DELETE product
router.delete(
	"/:id",
	[param("id").isString().notEmpty()],
	validate,
	async (req, res) => {
		try {
			const { id } = req.params;

			const [existing] = await pool.execute(
				"SELECT * FROM products WHERE id = ?",
				[id]
			);

			if (existing.length === 0) {
				return res.status(404).json({ error: "Product not found" });
			}

			await pool.execute("DELETE FROM products WHERE id = ?", [id]);

			logger.info(`Product deleted: ${id}`);
			res.json({ message: "Product deleted successfully" });
		} catch (error) {
			logger.error("Error deleting product:", error);
			res.status(500).json({ error: "Failed to delete product" });
		}
	}
);

// PATCH update stock (used by order service)
router.patch(
	"/:id/stock",
	[param("id").isString().notEmpty(), body("quantity").isInt()],
	validate,
	async (req, res) => {
		try {
			const { id } = req.params;
			const { quantity } = req.body;

			const [existing] = await pool.execute(
				"SELECT * FROM products WHERE id = ?",
				[id]
			);

			if (existing.length === 0) {
				return res.status(404).json({ error: "Product not found" });
			}

			const newStock = existing[0].stock + quantity;
			if (newStock < 0) {
				return res.status(400).json({ error: "Insufficient stock" });
			}

			await pool.execute("UPDATE products SET stock = ? WHERE id = ?", [
				newStock,
				id,
			]);

			const [updatedProduct] = await pool.execute(
				"SELECT * FROM products WHERE id = ?",
				[id]
			);

			logger.info(`Product stock updated: ${id}, new stock: ${newStock}`);
			res.json(updatedProduct[0]);
		} catch (error) {
			logger.error("Error updating stock:", error);
			res.status(500).json({ error: "Failed to update stock" });
		}
	}
);

module.exports = router;

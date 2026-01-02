const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { pool } = require("../config/database");
const logger = require("../utils/logger");

const router = express.Router();

// Product service URL
const PRODUCT_SERVICE_URL =
	process.env.PRODUCT_SERVICE_URL || "http://product-service:3001";

// Validation middleware
const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	next();
};

// Helper function to get product details
const getProductDetails = async (productId) => {
	try {
		const response = await axios.get(
			`${PRODUCT_SERVICE_URL}/api/products/${productId}`
		);
		return response.data;
	} catch (error) {
		logger.error(`Failed to fetch product ${productId}:`, error.message);
		return null;
	}
};

// Helper function to update product stock
const updateProductStock = async (productId, quantity) => {
	try {
		await axios.patch(
			`${PRODUCT_SERVICE_URL}/api/products/${productId}/stock`,
			{
				quantity: -quantity, // Negative to reduce stock
			}
		);
		return true;
	} catch (error) {
		logger.error(
			`Failed to update stock for product ${productId}:`,
			error.message
		);
		return false;
	}
};

// GET all orders with pagination
router.get(
	"/",
	[
		query("page").optional().isInt({ min: 1 }),
		query("limit").optional().isInt({ min: 1, max: 100 }),
		query("status")
			.optional()
			.isIn([
				"pending",
				"confirmed",
				"processing",
				"shipped",
				"delivered",
				"cancelled",
			]),
	],
	validate,
	async (req, res) => {
		try {
			const page = parseInt(req.query.page) || 1;
			const limit = parseInt(req.query.limit) || 10;
			const offset = (page - 1) * limit;
			const { status } = req.query;

			let whereClause = "";
			const params = [];

			if (status) {
				whereClause = "WHERE status = ?";
				params.push(status);
			}

			// Get total count
			const [countResult] = await pool.execute(
				`SELECT COUNT(*) as total FROM orders ${whereClause}`,
				params
			);
			const total = countResult[0].total;

			// Get orders
			const [orders] = await pool.execute(
				`SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ${parseInt(
					limit
				)} OFFSET ${parseInt(offset)}`,
				params
			);

			// Get items for each order
			for (let order of orders) {
				const [items] = await pool.execute(
					"SELECT * FROM order_items WHERE order_id = ?",
					[order.id]
				);
				order.items = items;
			}

			res.json({
				data: orders,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			logger.error("Error fetching orders:", error);
			res.status(500).json({ error: "Failed to fetch orders" });
		}
	}
);

// GET single order by ID
router.get(
	"/:id",
	[param("id").isString().notEmpty()],
	validate,
	async (req, res) => {
		try {
			const [orders] = await pool.execute("SELECT * FROM orders WHERE id = ?", [
				req.params.id,
			]);

			if (orders.length === 0) {
				return res.status(404).json({ error: "Order not found" });
			}

			const order = orders[0];

			// Get order items
			const [items] = await pool.execute(
				"SELECT * FROM order_items WHERE order_id = ?",
				[order.id]
			);
			order.items = items;

			res.json(order);
		} catch (error) {
			logger.error("Error fetching order:", error);
			res.status(500).json({ error: "Failed to fetch order" });
		}
	}
);

// POST create new order
router.post(
	"/",
	[
		body("customer_name").isString().notEmpty().trim(),
		body("customer_email").isEmail(),
		body("shipping_address").isString().notEmpty(),
		body("items").isArray({ min: 1 }),
		body("items.*.product_id").isString().notEmpty(),
		body("items.*.quantity").isInt({ min: 1 }),
	],
	validate,
	async (req, res) => {
		const connection = await pool.getConnection();

		try {
			await connection.beginTransaction();

			const { customer_name, customer_email, shipping_address, items } =
				req.body;
			const orderId = uuidv4();
			let totalAmount = 0;
			const orderItems = [];

			// Validate products and calculate total
			for (const item of items) {
				const product = await getProductDetails(item.product_id);

				if (!product) {
					await connection.rollback();
					return res.status(400).json({
						error: `Product not found: ${item.product_id}`,
					});
				}

				if (product.stock < item.quantity) {
					await connection.rollback();
					return res.status(400).json({
						error: `Insufficient stock for product: ${product.name}`,
					});
				}

				const itemTotal = product.price * item.quantity;
				totalAmount += itemTotal;

				orderItems.push({
					id: uuidv4(),
					order_id: orderId,
					product_id: item.product_id,
					product_name: product.name,
					quantity: item.quantity,
					unit_price: product.price,
					total_price: itemTotal,
				});
			}

			// Create order
			await connection.execute(
				`INSERT INTO orders (id, customer_name, customer_email, shipping_address, total_amount, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
				[orderId, customer_name, customer_email, shipping_address, totalAmount]
			);

			// Create order items
			for (const item of orderItems) {
				await connection.execute(
					`INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
					[
						item.id,
						item.order_id,
						item.product_id,
						item.product_name,
						item.quantity,
						item.unit_price,
						item.total_price,
					]
				);

				// Update product stock
				await updateProductStock(item.product_id, item.quantity);
			}

			await connection.commit();

			// Fetch the created order
			const [newOrder] = await pool.execute(
				"SELECT * FROM orders WHERE id = ?",
				[orderId]
			);
			newOrder[0].items = orderItems;

			logger.info(`Order created: ${orderId}`);
			res.status(201).json(newOrder[0]);
		} catch (error) {
			await connection.rollback();
			logger.error("Error creating order:", error);
			res.status(500).json({ error: "Failed to create order" });
		} finally {
			connection.release();
		}
	}
);

// PATCH update order status
router.patch(
	"/:id/status",
	[
		param("id").isString().notEmpty(),
		body("status").isIn([
			"pending",
			"confirmed",
			"processing",
			"shipped",
			"delivered",
			"cancelled",
		]),
	],
	validate,
	async (req, res) => {
		try {
			const { id } = req.params;
			const { status } = req.body;

			const [existing] = await pool.execute(
				"SELECT * FROM orders WHERE id = ?",
				[id]
			);

			if (existing.length === 0) {
				return res.status(404).json({ error: "Order not found" });
			}

			// If cancelling, restore product stock
			if (status === "cancelled" && existing[0].status !== "cancelled") {
				const [items] = await pool.execute(
					"SELECT * FROM order_items WHERE order_id = ?",
					[id]
				);

				for (const item of items) {
					await axios.patch(
						`${PRODUCT_SERVICE_URL}/api/products/${item.product_id}/stock`,
						{
							quantity: item.quantity, // Positive to restore stock
						}
					);
				}
			}

			await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [
				status,
				id,
			]);

			const [updatedOrder] = await pool.execute(
				"SELECT * FROM orders WHERE id = ?",
				[id]
			);

			const [items] = await pool.execute(
				"SELECT * FROM order_items WHERE order_id = ?",
				[id]
			);
			updatedOrder[0].items = items;

			logger.info(`Order ${id} status updated to: ${status}`);
			res.json(updatedOrder[0]);
		} catch (error) {
			logger.error("Error updating order status:", error);
			res.status(500).json({ error: "Failed to update order status" });
		}
	}
);

// DELETE order (only if pending)
router.delete(
	"/:id",
	[param("id").isString().notEmpty()],
	validate,
	async (req, res) => {
		try {
			const { id } = req.params;

			const [existing] = await pool.execute(
				"SELECT * FROM orders WHERE id = ?",
				[id]
			);

			if (existing.length === 0) {
				return res.status(404).json({ error: "Order not found" });
			}

			if (existing[0].status !== "pending") {
				return res.status(400).json({
					error: "Only pending orders can be deleted",
				});
			}

			// Restore product stock
			const [items] = await pool.execute(
				"SELECT * FROM order_items WHERE order_id = ?",
				[id]
			);

			for (const item of items) {
				await updateProductStock(item.product_id, -item.quantity); // Negative of negative = positive
			}

			await pool.execute("DELETE FROM orders WHERE id = ?", [id]);

			logger.info(`Order deleted: ${id}`);
			res.json({ message: "Order deleted successfully" });
		} catch (error) {
			logger.error("Error deleting order:", error);
			res.status(500).json({ error: "Failed to delete order" });
		}
	}
);

// GET order statistics
router.get("/stats/summary", async (req, res) => {
	try {
		const [totalOrders] = await pool.execute(
			"SELECT COUNT(*) as count FROM orders"
		);

		const [ordersByStatus] = await pool.execute(
			"SELECT status, COUNT(*) as count FROM orders GROUP BY status"
		);

		const [totalRevenue] = await pool.execute(
			'SELECT SUM(total_amount) as total FROM orders WHERE status != "cancelled"'
		);

		const [recentOrders] = await pool.execute(
			"SELECT * FROM orders ORDER BY created_at DESC LIMIT 5"
		);

		res.json({
			total_orders: totalOrders[0].count,
			orders_by_status: ordersByStatus,
			total_revenue: totalRevenue[0].total || 0,
			recent_orders: recentOrders,
		});
	} catch (error) {
		logger.error("Error fetching order stats:", error);
		res.status(500).json({ error: "Failed to fetch order statistics" });
	}
});

module.exports = router;

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const { register, collectDefaultMetrics } = require("prom-client");
const logger = require("./utils/logger");
const orderRoutes = require("./routes/orders");
const healthRoutes = require("./routes/health");
const db = require("./config/database");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Collect default Prometheus metrics
collectDefaultMetrics({ prefix: "order_service_" });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
	const start = Date.now();
	res.on("finish", () => {
		const duration = Date.now() - start;
		logger.info({
			method: req.method,
			url: req.url,
			status: res.statusCode,
			duration: `${duration}ms`,
		});
	});
	next();
});

// Routes
app.use("/api/orders", orderRoutes);
app.use("/health", healthRoutes);

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
	try {
		res.set("Content-Type", register.contentType);
		res.end(await register.metrics());
	} catch (err) {
		res.status(500).end(err);
	}
});

// Root endpoint
app.get("/", (req, res) => {
	res.json({
		service: "Order Service",
		version: "1.0.0",
		status: "running",
		endpoints: {
			orders: "/api/orders",
			health: "/health",
			metrics: "/metrics",
		},
	});
});

// Error handling middleware
app.use((err, req, res, next) => {
	logger.error({
		message: err.message,
		stack: err.stack,
	});
	res.status(500).json({
		error: "Internal Server Error",
		message: process.env.NODE_ENV === "development" ? err.message : undefined,
	});
});

// Initialize database and start server
const startServer = async () => {
	try {
		// Test database connection
		await db.testConnection();
		logger.info("Database connection established");

		// Initialize database tables
		await db.initializeTables();
		logger.info("Database tables initialized");

		// Start server
		app.listen(PORT, "0.0.0.0", () => {
			logger.info(`Order Service running on port ${PORT}`);
		});
	} catch (error) {
		logger.error("Failed to start server:", error);
		process.exit(1);
	}
};

startServer();

module.exports = app;

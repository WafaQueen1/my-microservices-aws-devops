const express = require("express");
const { pool } = require("../config/database");

const router = express.Router();

// Liveness probe - basic check that the service is running
router.get("/live", (req, res) => {
	res.status(200).json({
		status: "ok",
		service: "product-service",
		timestamp: new Date().toISOString(),
	});
});

// Readiness probe - check that the service is ready to accept traffic
router.get("/ready", async (req, res) => {
	try {
		// Check database connection
		const connection = await pool.getConnection();
		await connection.ping();
		connection.release();

		res.status(200).json({
			status: "ready",
			service: "product-service",
			database: "connected",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(503).json({
			status: "not ready",
			service: "product-service",
			database: "disconnected",
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
});

// General health check
router.get("/", async (req, res) => {
	let dbStatus = "disconnected";

	try {
		const connection = await pool.getConnection();
		await connection.ping();
		connection.release();
		dbStatus = "connected";
	} catch (error) {
		dbStatus = `error: ${error.message}`;
	}

	const healthInfo = {
		service: "product-service",
		status: dbStatus === "connected" ? "healthy" : "unhealthy",
		version: "1.0.0",
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
		checks: {
			database: dbStatus,
			memory: {
				used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
				total:
					Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
			},
		},
	};

	const statusCode = dbStatus === "connected" ? 200 : 503;
	res.status(statusCode).json(healthInfo);
});

module.exports = router;

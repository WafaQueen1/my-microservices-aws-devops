const winston = require("winston");

const logFormat = winston.format.combine(
	winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
	winston.format.errors({ stack: true }),
	winston.format.json()
);

const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: logFormat,
	defaultMeta: { service: "order-service" },
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple()
			),
		}),
		new winston.transports.File({
			filename: "/var/log/order-service/error.log",
			level: "error",
			maxsize: 5242880,
			maxFiles: 5,
		}),
		new winston.transports.File({
			filename: "/var/log/order-service/combined.log",
			maxsize: 5242880,
			maxFiles: 5,
		}),
	],
});

module.exports = logger;

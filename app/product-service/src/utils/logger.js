const winston = require("winston");

const logFormat = winston.format.combine(
	winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
	winston.format.errors({ stack: true }),
	winston.format.json()
);

const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: logFormat,
	defaultMeta: { service: "product-service" },
	transports: [
		// Write all logs to console
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple()
			),
		}),
		// Write error logs to file
		new winston.transports.File({
			filename: "/var/log/product-service/error.log",
			level: "error",
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
		// Write all logs to file
		new winston.transports.File({
			filename: "/var/log/product-service/combined.log",
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
	],
});

// If we're in development, also log to console with pretty format
if (process.env.NODE_ENV === "development") {
	logger.add(
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.printf(({ level, message, timestamp, ...metadata }) => {
					let msg = `${timestamp} [${level}]: ${message}`;
					if (
						Object.keys(metadata).length > 0 &&
						metadata.service === undefined
					) {
						msg += ` ${JSON.stringify(metadata)}`;
					}
					return msg;
				})
			),
		})
	);
}

module.exports = logger;

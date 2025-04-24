import { pino } from "pino";

// Log level hierarchy: trace < debug < info < warn < error < fatal
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

// Configuration for the logger
interface LoggerConfig {
	level: LogLevel;
	prettyPrint: boolean;
}

// Get log level from environment or default to 'info'
const getLoggerConfig = (): LoggerConfig => {
	return {
		level: (process.env.LOG_LEVEL as LogLevel) || "info",
		prettyPrint: process.env.LOG_PRETTY_PRINT !== "false", // Default to true
	};
};

// Create the logger instance
const createLogger = () => {
	const config = getLoggerConfig();

	const transport = config.prettyPrint
		? {
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "SYS:standard",
					ignore: "pid,hostname",
				},
		  }
		: undefined;

	return pino({
		level: config.level,
		transport,
		timestamp: pino.stdTimeFunctions.isoTime,
	});
};

// Export a singleton logger instance
export const logger = createLogger();

// Log HTTP requests
export const requestLogger = (req: any, _res: any, next?: () => void) => {
	logger.debug(
		{
			method: req.method,
			url: req.url,
			query: req.query,
			params: req.params,
			body: req.body,
			headers: req.headers,
		},
		"Incoming request"
	);

	if (next) next();
};

// Re-export log methods for convenience
export const trace = (obj: object | string, msg?: string) => {
	if (typeof obj === "string") {
		logger.trace(obj);
	} else {
		logger.trace(obj, msg);
	}
};

export const debug = (obj: object | string, msg?: string) => {
	if (typeof obj === "string") {
		logger.debug(obj);
	} else {
		logger.debug(obj, msg);
	}
};

export const info = (obj: object | string, msg?: string) => {
	if (typeof obj === "string") {
		logger.info(obj);
	} else {
		logger.info(obj, msg);
	}
};

export const warn = (obj: object | string, msg?: string) => {
	if (typeof obj === "string") {
		logger.warn(obj);
	} else {
		logger.warn(obj, msg);
	}
};

export const error = (obj: object | string, msg?: string) => {
	if (typeof obj === "string") {
		logger.error(obj);
	} else {
		logger.error(obj, msg);
	}
};

export const fatal = (obj: object | string, msg?: string) => {
	if (typeof obj === "string") {
		logger.fatal(obj);
	} else {
		logger.fatal(obj, msg);
	}
};

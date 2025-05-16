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

// Unused helper functions removed.
// Users can call logger.trace(), logger.debug() etc. directly.

/* eslint-disable @typescript-eslint/no-require-imports */

interface Logger {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

function createServerLogger(): Logger {
  const winston = require("winston");
  const path = require("path");
  const logsDir = path.join(process.cwd(), "logs");

  const instance = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: "novadesk" },
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, "combined.log"),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
      }),
    ],
  });

  if (process.env.NODE_ENV !== "production") {
    instance.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }: Record<string, unknown>) => {
            const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : "";
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        ),
      })
    );
  }

  return instance;
}

const logger: Logger = typeof window === "undefined"
  ? createServerLogger()
  : { error: console.error, warn: console.warn, info: console.log, debug: console.debug };

export default logger;

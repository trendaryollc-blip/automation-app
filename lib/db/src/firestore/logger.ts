/**
 * Simple logger for the Firestore module.
 * Can be replaced with pino or winston in production.
 */

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

function getLogLevel(): LogLevel {
  const env = process.env["LOG_LEVEL"] || "info";
  if (LOG_LEVELS.includes(env as LogLevel)) {
    return env as LogLevel;
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  const current = getLogLevel();
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(current);
}

function formatMessage(
  level: LogLevel,
  msg: string,
  data?: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [FIREBASE:${level.toUpperCase()}]`;
  if (data && Object.keys(data).length > 0) {
    return `${prefix} ${msg} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${msg}`;
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog("debug")) console.debug(formatMessage("debug", msg, data));
  },
  info: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog("info")) console.info(formatMessage("info", msg, data));
  },
  warn: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog("warn")) console.warn(formatMessage("warn", msg, data));
  },
  error: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog("error")) console.error(formatMessage("error", msg, data));
  },
};

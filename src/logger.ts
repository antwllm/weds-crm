import * as Sentry from '@sentry/node';

type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
}

function formatEntry(level: string, message: string, context?: LogContext): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };
}

export const logger = {
  info(message: string, context?: LogContext): void {
    const entry = formatEntry('info', message, context);
    console.log(JSON.stringify(entry));
  },

  warn(message: string, context?: LogContext): void {
    const entry = formatEntry('warn', message, context);
    console.warn(JSON.stringify(entry));
  },

  error(message: string, context?: LogContext): void {
    const entry = formatEntry('error', message, context);
    console.error(JSON.stringify(entry));

    // Send to Sentry if configured
    if (process.env.SENTRY_DSN) {
      const error = context?.error instanceof Error
        ? context.error
        : new Error(message);
      Sentry.captureException(error, {
        extra: context,
      });
    }
  },

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      const entry = formatEntry('debug', message, context);
      console.log(JSON.stringify(entry));
    }
  },
};

const LOG_LEVEL = process.env.NEXT_PUBLIC_LOG_LEVEL || 'info';

const levels: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = levels[LOG_LEVEL] || 1;

function formatMessage(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (data !== undefined) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  debug: (message: string, data?: any) => {
    if (currentLevel <= 0) {
      console.debug(formatMessage('debug', message, data));
    }
  },
  info: (message: string, data?: any) => {
    if (currentLevel <= 1) {
      console.info(formatMessage('info', message, data));
    }
  },
  warn: (message: string, data?: any) => {
    if (currentLevel <= 2) {
      console.warn(formatMessage('warn', message, data));
    }
  },
  error: (message: string, data?: any) => {
    if (currentLevel <= 3) {
      console.error(formatMessage('error', message, data));
    }
  },
};

// Shared logging interface that works on both client and server
export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogMeta {
  [key: string]: any;
}

export interface ILogger {
  error(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
}

// Client-side logger implementation
export class ClientLogger implements ILogger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatMessage(level: string, message: string, meta?: LogMeta): void {
    const timestamp = new Date().toISOString();
    const emoji = this.getEmoji(level);
    
    if (meta && Object.keys(meta).length > 0) {
      console.groupCollapsed(`${emoji} [${timestamp}] ${message}`);
      console.table(meta);
      console.groupEnd();
    } else {
      console.log(`${emoji} [${timestamp}] ${message}`);
    }
  }

  private getEmoji(level: string): string {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return '✅';
      case 'debug': return '🔍';
      default: return '📝';
    }
  }

  error(message: string, meta?: LogMeta): void {
    console.error(`❌ ${message}`, meta || '');
    // In production, could send to error tracking service
    if (!this.isDevelopment && typeof window !== 'undefined') {
      // Send to error tracking service (Sentry, LogRocket, etc.)
    }
  }

  warn(message: string, meta?: LogMeta): void {
    if (this.isDevelopment) {
      this.formatMessage('warn', message, meta);
    }
  }

  info(message: string, meta?: LogMeta): void {
    if (this.isDevelopment) {
      this.formatMessage('info', message, meta);
    }
  }

  debug(message: string, meta?: LogMeta): void {
    if (this.isDevelopment) {
      this.formatMessage('debug', message, meta);
    }
  }
}

// Server-side logger implementation (wrapper around winston)
export class ServerLogger implements ILogger {
  private winston: any;

  constructor(winstonLogger: any) {
    this.winston = winstonLogger;
  }

  error(message: string, meta?: LogMeta): void {
    this.winston.error(message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.winston.warn(message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.winston.info(message, meta);
  }

  debug(message: string, meta?: LogMeta): void {
    this.winston.debug(message, meta);
  }
}

// Factory function to create appropriate logger
export function createLogger(): ILogger {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return new ClientLogger();
  }
  
  // Server environment - use winston
  try {
    const winston = require('../server/logger.js').default;
    return new ServerLogger(winston);
  } catch (error) {
    // Fallback to console if winston isn't available
    return new ClientLogger();
  }
}

// Default export for convenience
export default createLogger();

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Environment check - only create file system logs on server
const isServer = typeof window === 'undefined' && typeof process !== 'undefined';

// Create logs directory if it doesn't exist (server only)
let logsDir: string = '';
if (isServer) {
  logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Custom format for beautiful console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info: any) => {
    const { timestamp, level, message, service, ...meta } = info;
    
    // Create a beautiful header with emojis based on log level
    let emoji = '';
    let prefix = '';
    switch (info.level.toLowerCase().replace(/\u001b\[[0-9;]*m/g, '')) { // Remove ANSI codes for comparison
      case 'error':
        emoji = '❌';
        prefix = 'ERROR';
        break;
      case 'warn':
        emoji = '⚠️ ';
        prefix = 'WARN ';
        break;
      case 'info':
        emoji = '✅';
        prefix = 'INFO ';
        break;
      case 'debug':
        emoji = '🔍';
        prefix = 'DEBUG';
        break;
      default:
        emoji = '📝';
        prefix = 'LOG  ';
    }

    // Format the main log line
    let output = `${emoji} ${timestamp} [${level}] ${message}`;
    
    // Add service info if present and not default
    if (service && service !== 'inventory-tracker') {
      output += ` (${service})`;
    }
    
    // Format metadata beautifully
    const filteredMeta = { ...meta };
    delete filteredMeta.service; // Remove service from meta since we handle it above
    
    if (Object.keys(filteredMeta).length > 0) {
      output += '\n📋 Details:';
      
      // Handle different types of metadata
      for (const [key, value] of Object.entries(filteredMeta)) {
        if (key === 'stack' && typeof value === 'string') {
          // Special handling for stack traces
          output += `\n   📚 ${key}:\n${value.split('\n').map(line => `      ${line}`).join('\n')}`;
        } else if (key === 'error' && typeof value === 'string') {
          // Special handling for error messages
          output += `\n   🚨 ${key}: ${value}`;
        } else if (key === 'duration') {
          // Special handling for timing
          output += `\n   ⏱️  ${key}: ${value}`;
        } else if (key === 'query') {
          // Special handling for SQL queries
          output += `\n   🗃️  ${key}: ${value}`;
        } else if (key === 'userId' || key === 'sessionId') {
          // Special handling for IDs
          output += `\n   🆔 ${key}: ${value}`;
        } else if (typeof value === 'object') {
          // Handle nested objects
          output += `\n   📄 ${key}: ${JSON.stringify(value, null, 6).split('\n').map((line, index) => index === 0 ? line : `      ${line}`).join('\n')}`;
        } else {
          // Handle simple values
          output += `\n   📌 ${key}: ${value}`;
        }
      }
    }
    
    return output;
  })
);

// Beautiful file format (structured but readable)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info: any) => {
    const { timestamp, level, message, service, ...meta } = info;
    
    // Create a clean, structured format for files
    let output = `[${timestamp}] ${level.toUpperCase().padEnd(5)} | ${message}`;
    
    if (service) {
      output += ` | service: ${service}`;
    }
    
    if (Object.keys(meta).length > 0) {
      output += ` | ${JSON.stringify(meta)}`;
    }
    
    return output;
  })
);

// Create the main logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'inventory-tracker' },
  transports: [
    // Only add file transports on server
    ...(isServer ? [
      // Write all logs with importance level of `error` or less to `error.log`
      new winston.transports.File({ 
        filename: path.join(logsDir, 'error.log'), 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: fileFormat
      }),
      // Write all logs with importance level of `info` or less to `combined.log`
      new winston.transports.File({ 
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: fileFormat
      })
    ] : []),
  ],
});

// Add console output (works on both client and server)
logger.add(new winston.transports.Console({
  format: consoleFormat
}));

export default logger;

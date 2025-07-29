import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { createServer } from "http";
import router from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import logger from "./logger.js";
// Add connection manager import
import { initializeDefaultConnection, getConnectionStatus, closeAllConnections } from "./connection-manager.js";

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Log environment variables for debugging
logger.info('🔍 Environment check:', {
  SQL_SERVER: process.env.SQL_SERVER,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT
});

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    userId: number;
    sessionId: string; // Add sessionId for role-based connection management
  }
}

const app = express();

// **NEW: Initialize server with proper SQL connection setup**
async function initializeServer() {
  try {
    logger.info('🚀 Starting Inventory Tracker Server...');
    
    // **STEP 1: Establish default SQL connection (john_login_user)**
    logger.info('🔧 Initializing default SQL connection...');
    const defaultConnection = await initializeDefaultConnection();
    
    if (!defaultConnection) {
      logger.error('❌ Failed to establish default SQL connection. Server cannot start.');
      logger.error('💡 Check your .env file and SQL Server connectivity');
      process.exit(1);
    }
    
    logger.info('✅ Default SQL connection established successfully');
    logger.info('📊 Connection Status:', getConnectionStatus());
    
    return true;
    
  } catch (error: any) {
    logger.error('❌ Server initialization failed:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Enable CORS for credentials - fix for development
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5000',
    req.headers.origin
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add cookie parser for token authentication
app.use((req, res, next) => {
  const cookies: any = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach((cookie: string) => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  (req as any).cookies = cookies;
  next();
});

// Configure session store with memory store
const MemStore = MemoryStore(session);

// Configure session middleware
app.use(session({
  store: new MemStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  secret: process.env.SESSION_SECRET || 'inventory-management-secret-key-for-development',
  resave: false,    // Don't save session if unmodified (recommended)
  saveUninitialized: false, // Don't create session until something stored (recommended)
  rolling: true,    // Reset expiration on every request
  cookie: {
    secure: false,    // False for HTTP development
    httpOnly: true,   // True for security - prevents JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',  // Lax for cross-origin compatibility
    path: '/'         // Available on all paths
  },
  name: 'connect.sid'  // Match standard Express session cookie name
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// **Enhanced graceful shutdown handling**
async function gracefulShutdown(signal: string) {
  logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);
  try {
    await closeAllConnections();
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

(async () => {
  // **Initialize SQL connections before starting server**
  await initializeServer();
  
  // Register API routes
  app.use('/api', router);

  // Create HTTP server
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const nodeEnv = (process.env.NODE_ENV || app.get("env")).trim().toLowerCase();
  logger.info(`🔍 Detected environment: "${nodeEnv}"`, { 
    NODE_ENV: process.env.NODE_ENV, 
    app_env: app.get("env") 
  });
  
  if (nodeEnv === "development") {
    logger.info('✅ Starting in DEVELOPMENT mode - using Vite dev server');
    await setupVite(app, server);
  } else {
    logger.info('✅ Starting in PRODUCTION mode - serving static files');
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "127.0.0.1",
  }, () => {
    logger.info(`🌐 Server running on port ${port}`);
    logger.info('🔗 Default SQL connection ready for authentication');
    logger.info('📊 Server fully initialized and ready to accept requests');
  });
})();
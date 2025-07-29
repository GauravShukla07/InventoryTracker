import sql from 'mssql';
import logger from '@shared/logger';

// Enhanced connection state management
const sessionConnections = new Map<string, sql.ConnectionPool>();
const sessionUsers = new Map<string, string>(); // **NEW: Track which user each session belongs to**
let defaultConnection: sql.ConnectionPool | null = null;
let authConnection: sql.ConnectionPool | null = null;

function createServerConfig(): sql.config {
  const config = {
    server: process.env.SQL_SERVER_HOST,          // Windows SQL Server IP address
    database: process.env.SQL_DATABASE ,           // Target database name (FIXED: removed 'USE ')
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 1433,                        // SQL Server port (non-standard for security)
    options: {
      encrypt: process.env.SQL_ENCRYPT === 'true' ? true : false,                  // Disable encryption for internal network
      trustServerCertificate: process.env.SQL_TRUST_CERT === 'true' ? true : true,    // Trust self-signed certificates
      enableArithAbort: true,          // Enable arithmetic abort for better error handling
      connectTimeout: parseInt(process.env.SQL_TIMEOUT || '60000'),           // Connection timeout (60 seconds)
      requestTimeout: parseInt(process.env.SQL_REQUEST_TIMEOUT || '60000'),           // Query timeout (60 seconds)
      multipleActiveResultSets: true,  // Allow multiple result sets per connection
    },
    pool: {
      max: 10,                         // Maximum connections in pool
      min: 0,                          // Minimum connections in pool
      idleTimeoutMillis: 30000         // Idle timeout before connection closes
    }
  };
  // console.log('🔧 SQL Server connection config:', config);
  return config as sql.config;
};

function createAuthUserConfig(): sql.config {
  return {
    ...createServerConfig(),
    user: process.env.SQL_USER || '',               // Low-privilege authentication user
    password: process.env.SQL_PASSWORD || '',      // Authentication password from environment
  } as sql.config;
}

/**
 * **NEW: Initialize default connection on server startup**
 * This replaces the on-demand auth connection approach
 */
export async function initializeDefaultConnection(): Promise<sql.ConnectionPool | null> {
  try {
    // Return existing if already connected
    if (defaultConnection && defaultConnection.connected) {
      logger.info('✅ Default connection already established');
      return defaultConnection;
    }

    logger.info('🔧 Establishing default SQL connection...');
    logger.info('📋 Connection details:', {
      server: process.env.SQL_SERVER_HOST,
      database: process.env.SQL_DATABASE,
      user: process.env.SQL_USER,
      port: process.env.SQL_PORT || 1433,
      instance: process.env.SQL_INSTANCE || 'default'
    });
    
    const defaultConfig = createAuthUserConfig();
    defaultConnection = new sql.ConnectionPool(defaultConfig);
    await defaultConnection.connect();
    
    // **Test the connection**
    const testResult = await defaultConnection.request().query('SELECT 1 as test, GETDATE() as timestamp');
    
    logger.info('✅ Default SQL connection established successfully', {
      user: process.env.SQL_USER,
      database: process.env.SQL_DATABASE,
      server: process.env.SQL_SERVER_HOST,
      testResult: testResult.recordset[0]
    });
    
    // **Also set as auth connection for backwards compatibility**
    authConnection = defaultConnection;
    
    return defaultConnection;
    
  } catch (error: any) {
    logger.error('❌ Failed to establish default SQL connection:', {
      error: error.message,
      server: process.env.SQL_SERVER_HOST,
      user: process.env.SQL_USER,
      database: process.env.SQL_DATABASE,
      stack: error.stack
    });
    defaultConnection = null;
    authConnection = null;
    return null;
  }
}

/**
 * **Enhanced: Get comprehensive connection status**
 */
export function getConnectionStatus(): {
  defaultConnection: {
    established: boolean;
    user: string;
    database: string;
    server: string;
    connectedAt?: Date;
  };
  activeSessions: number;
  sessionList: Array<{
    sessionId: string;
    user: string;
    established: boolean;
    connectedAt?: Date;
  }>;
} {
  // **FIXED: Use tracked user information instead of accessing connection.config**
  const sessionDetails = Array.from(sessionConnections.entries()).map(([sessionId, connection]) => {
    return {
      sessionId,
      user: sessionUsers.get(sessionId) || 'unknown', // **Get user from our tracking map**
      established: connection.connected,
      connectedAt: new Date() // **TODO: Track actual connection time**
    };
  });

  return {
    defaultConnection: {
      established: !!(defaultConnection && defaultConnection.connected),
      user: process.env.SQL_USER || 'not-set',
      database: process.env.SQL_DATABASE || 'not-set',
      server: process.env.SQL_SERVER_HOST || 'not-set',
      connectedAt: defaultConnection ? new Date() : undefined
    },
    activeSessions: sessionConnections.size,
    sessionList: sessionDetails
  };
}

/**
 * **NEW: Get default connection (replaces getAuthConnection)**
 */
export function getDefaultConnection(): sql.ConnectionPool | null {
  return (defaultConnection && defaultConnection.connected) ? defaultConnection : null;
}

/**
 * **Keep for backwards compatibility**
 */
export function getAuthConnection(): sql.ConnectionPool | null {
  return getDefaultConnection();
}

/**
 * **Enhanced: Authenticate using cached default connection**
 */
export async function authenticateUser(emailOrUsername: string, password: string): Promise<{
  user: any;
  dbUser: string;
  dbPassword: string;
} | null> {
  try {
    // **Use cached default connection instead of creating new one**
    const connection = getDefaultConnection();
    if (!connection) {
      throw new Error('Default SQL connection not available. Server may need restart.');
    }
    
    logger.info(`🔍 Authenticating user: ${emailOrUsername} using cached connection`);

    // **Rest of authentication logic remains the same**
    const result = await connection.request()
      .input('emailOrUsername', sql.VarChar, emailOrUsername)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT 
          UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive
        FROM users 
        WHERE (Email = @emailOrUsername OR Username = @emailOrUsername) 
        AND PasswordHash = @password
        AND IsActive = 1
      `);

    if (result.recordset.length === 0) {
      logger.warn('❌ Authentication failed: Invalid credentials', { emailOrUsername });
      return null;
    }

    const user = result.recordset[0];
    logger.info(`✅ User authenticated via cached connection: ${user.username} (role: ${user.role})`);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: null
      },
      dbUser: user.role,
      dbPassword: user.rolePassword
    };

  } catch (error: any) {
    logger.error('❌ Authentication error:', {
      error: error.message,
      emailOrUsername,
      stack: error.stack
    });
    return null;
  }
}

/**
 * **Enhanced: Create role-based connection and track user info**
 */
export async function createUserConnection(sessionId: string, dbUser: string, dbPassword: string): Promise<sql.ConnectionPool | null> {
  try {
    // **Close existing session connection if exists**
    await closeSessionConnection(sessionId);

    logger.info(`🔄 Creating role-based connection for user: ${dbUser}, session: ${sessionId.substring(0, 8)}...`);
    
    const userConfig: sql.config = {
      ...createServerConfig(),
      user: dbUser,
      password: dbPassword,
    } as sql.config;

    const connection = new sql.ConnectionPool(userConfig);
    await connection.connect();
    
    // **Test the role-based connection**
    await connection.request().query('SELECT 1 as test');
    
    // **Store connection and user info for this session**
    sessionConnections.set(sessionId, connection);
    sessionUsers.set(sessionId, dbUser); // **Track the user for this session**
    
    logger.info(`✅ Role-based connection established`, {
      sessionId: sessionId.substring(0, 8) + '...',
      dbUser,
      totalSessions: sessionConnections.size
    });
    
    return connection;
    
  } catch (error: any) {
    logger.error(`❌ Failed to create role-based connection:`, {
      sessionId: sessionId.substring(0, 8) + '...',
      dbUser,
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * **Get session connection for a specific session**
 */
export function getSessionConnection(sessionId: string): sql.ConnectionPool | null {
  const connection = sessionConnections.get(sessionId);
  return (connection && connection.connected) ? connection : null;
}

/**
 * **Close a specific session connection**
 */
export async function closeSessionConnection(sessionId: string): Promise<void> {
  const connection = sessionConnections.get(sessionId);
  if (connection) {
    try {
      await connection.close();
      sessionConnections.delete(sessionId);
      sessionUsers.delete(sessionId); // **Also remove user tracking**
      logger.info(`🔌 Closed session connection: ${sessionId.substring(0, 8)}...`);
    } catch (error: any) {
      logger.error(`❌ Error closing session connection ${sessionId.substring(0, 8)}...:`, {
        error: error.message,
        stack: error.stack
      });
    }
  }
}

/**
 * **NEW: Close default connection (for graceful shutdown)**
 */
export async function closeDefaultConnection(): Promise<void> {
  if (defaultConnection) {
    try {
      await defaultConnection.close();
      logger.info('🔌 Default SQL connection closed');
    } catch (error: any) {
      logger.error('❌ Error closing default connection:', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      defaultConnection = null;
      authConnection = null;
    }
  }
}

/**
 * **Enhanced: Close all connections including default**
 */
export async function closeAllConnections(): Promise<void> {
  logger.info('🔌 Closing all SQL connections...');
  
  // **Close all session connections**
  const sessionPromises: Promise<void>[] = [];
  for (const [sessionId, connection] of Array.from(sessionConnections.entries())) {
    sessionPromises.push(
      connection.close()
        .then(() => {
          logger.info(`🔌 Closed session connection: ${sessionId.substring(0, 8)}...`);
        })
        .catch((error: any) => {
          logger.error(`❌ Error closing session ${sessionId.substring(0, 8)}...:`, {
            error: error.message,
            stack: error.stack
          });
        })
    );
  }
  
  // Wait for all session connections to close
  await Promise.allSettled(sessionPromises);
  sessionConnections.clear();
  sessionUsers.clear(); // **Clear user tracking as well**
  
  // **Close default connection**
  await closeDefaultConnection();
  
  logger.info('✅ All SQL connections closed');
}

/**
 * **Keep existing function for backwards compatibility**
 */
export async function ensureAuthConnection(): Promise<sql.ConnectionPool | null> {
  return getDefaultConnection();
}

// **FIXED: Simplified graceful shutdown setup to avoid conflicts**
let shutdownHandlersSetup = false;

export function setupGracefulShutdown(): void {
  if (shutdownHandlersSetup) return;
  
  const gracefulShutdown = async (signal: string) => {
    logger.info(`🛑 Received ${signal}, closing connections...`);
    try {
      await closeAllConnections();
      process.exit(0);
    } catch (error: any) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  process.on('uncaughtException', async (error) => {
    logger.error('💥 Uncaught Exception:', {
      error: error.message,
      stack: error.stack
    });
    await closeAllConnections();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    logger.error('💥 Unhandled Promise Rejection:', {
      reason: String(reason),
      promise: String(promise)
    });
    await closeAllConnections();
    process.exit(1);
  });
  
  shutdownHandlersSetup = true;
}

// **Call setup function instead of directly setting up handlers**
setupGracefulShutdown();
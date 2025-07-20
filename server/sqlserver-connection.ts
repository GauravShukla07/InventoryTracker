import sql from 'mssql';

/**
 * Enhanced SQL Server connection module with support for both
 * SQL Server Authentication and Windows Authentication
 */

// Connection configuration based on environment variables
function createConnectionConfig(): sql.config {
  const serverName = process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS';
  const database = process.env.SQL_DATABASE || 'InventoryDB';
  const username = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  
  // Determine authentication method
  const useSqlAuth = !!(username && password);
  
  console.log(`🔧 SQL Server connection mode: ${useSqlAuth ? 'SQL Authentication' : 'Windows Authentication'}`);
  console.log(`📍 Server: ${serverName}`);
  console.log(`🗄️  Database: ${database}`);
  if (useSqlAuth) {
    console.log(`👤 User: ${username}`);
  }
  
  if (useSqlAuth) {
    // SQL Server Authentication (similar to Python ODBC connection)
    return {
      server: serverName,
      database: database,
      user: username!,
      password: password!,
      options: {
        encrypt: process.env.SQL_ENCRYPT === 'true' || false,
        trustServerCertificate: process.env.SQL_TRUST_CERT !== 'false', // Default to true
        enableArithAbort: true,
        instanceName: extractInstanceName(serverName),
        connectTimeout: parseInt(process.env.SQL_TIMEOUT || '30000'),
        requestTimeout: parseInt(process.env.SQL_REQUEST_TIMEOUT || '30000'),
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
  } else {
    // Windows Authentication (fallback)
    return {
      server: serverName,
      database: database,
      authentication: {
        type: 'ntlm',
        options: {
          domain: process.env.SQL_DOMAIN || '',
          userName: process.env.SQL_USER || '',
          password: process.env.SQL_PASSWORD || '',
        }
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: extractInstanceName(serverName),
        connectTimeout: 30000,
        requestTimeout: 30000,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
  }
}

function extractInstanceName(serverName: string): string | undefined {
  const parts = serverName.split('\\');
  return parts.length > 1 ? parts[1] : undefined;
}

let connectionPool: sql.ConnectionPool | null = null;

/**
 * Get or create SQL Server connection pool
 * Supports both SQL Server Authentication and Windows Authentication
 */
export async function getSqlServerConnection(): Promise<sql.ConnectionPool | null> {
  try {
    // Return existing connection if available
    if (connectionPool && connectionPool.connected) {
      return connectionPool;
    }
    
    // Close existing pool if it exists but not connected
    if (connectionPool) {
      await connectionPool.close();
    }
    
    const config = createConnectionConfig();
    console.log('🔗 Attempting SQL Server connection...');
    
    connectionPool = new sql.ConnectionPool(config);
    await connectionPool.connect();
    
    console.log('✅ SQL Server connection established successfully');
    return connectionPool;
    
  } catch (error: any) {
    console.error('❌ SQL Server connection failed:', error.message);
    connectionPool = null;
    return null;
  }
}

/**
 * Execute a SQL query with proper error handling
 */
export async function executeSqlQuery(query: string, parameters?: any): Promise<sql.IResult<any>> {
  const connection = await getSqlServerConnection();
  if (!connection) {
    throw new Error('Failed to establish SQL Server connection');
  }
  
  const request = connection.request();
  
  // Add parameters if provided
  if (parameters) {
    Object.entries(parameters).forEach(([key, value]) => {
      request.input(key, value);
    });
  }
  
  return await request.query(query);
}

/**
 * Test SQL Server connection with detailed diagnostics
 */
export async function testSqlServerConnection(): Promise<boolean> {
  try {
    const connection = await getSqlServerConnection();
    if (!connection) {
      return false;
    }
    
    // Test with a simple query
    await executeSqlQuery('SELECT 1 as test');
    return true;
    
  } catch (error: any) {
    console.error('🔍 Connection test failed:', error.message);
    return false;
  }
}

/**
 * Close SQL Server connection pool
 */
export async function closeSqlServerConnection(): Promise<void> {
  if (connectionPool) {
    try {
      await connectionPool.close();
      console.log('🔌 SQL Server connection closed');
    } catch (error) {
      console.error('❌ Error closing SQL Server connection:', error);
    } finally {
      connectionPool = null;
    }
  }
}

/**
 * Get connection status information
 */
export function getConnectionInfo(): {
  isConnected: boolean;
  authMethod: string;
  server: string;
  database: string;
} {
  const config = createConnectionConfig();
  const useSqlAuth = !!(process.env.SQL_USER && process.env.SQL_PASSWORD);
  
  return {
    isConnected: connectionPool?.connected || false,
    authMethod: useSqlAuth ? 'SQL Server Authentication' : 'Windows Authentication',
    server: config.server || 'Unknown',
    database: config.database || 'Unknown'
  };
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await closeSqlServerConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeSqlServerConnection();
  process.exit(0);
});
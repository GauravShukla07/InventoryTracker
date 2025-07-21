import sql from 'mssql';
import { runNetworkDiagnostics } from './network-diagnostics';

/**
 * Database Connection Testing Utility
 * Allows testing SQL Server connections with custom credentials
 * Accessible both before and after login for diagnostics
 */

export interface ConnectionTestParams {
  server: string;
  database: string;
  uid: string;
  pwd: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  connectTimeout?: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  connectionTime?: number;
  serverInfo?: {
    version?: string;
    productName?: string;
  };
  error?: string;
}

/**
 * Test database connection with provided credentials
 */
export async function testDatabaseConnection(params: ConnectionTestParams): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  let testPool: sql.ConnectionPool | null = null;

  try {
    console.log(`🧪 Testing connection to ${params.server} as ${params.uid}...`);
    
    // Parse server name to handle instance names properly
    let serverName = params.server;
    let instanceName = '';
    
    if (params.server.includes('\\')) {
      const parts = params.server.split('\\');
      serverName = parts[0];
      instanceName = parts[1];
      console.log(`🔍 Parsed server: ${serverName}, instance: ${instanceName}`);
    }

    // Build connection configuration with proper server/instance handling
    const config: sql.config = {
      server: serverName,
      database: params.database,
      user: params.uid,
      password: params.pwd,
      options: {
        encrypt: params.encrypt ?? false,
        trustServerCertificate: params.trustServerCertificate ?? true,
        enableArithAbort: true,
        connectTimeout: params.connectTimeout ?? 15000,
        requestTimeout: 15000,
        instanceName: instanceName || undefined,
      },
      pool: {
        max: 1,
        min: 0,
        idleTimeoutMillis: 5000
      }
    };
    
    console.log(`🔧 Connection config: server=${config.server}, instanceName=${config.options?.instanceName}, database=${config.database}, user=${config.user}`);

    // Attempt connection
    testPool = new sql.ConnectionPool(config);
    await testPool.connect();

    const connectionTime = Date.now() - startTime;
    console.log(`✅ Connection successful in ${connectionTime}ms`);

    // Test basic query to verify permissions
    const result = await testPool.request().query('SELECT @@VERSION as version, @@SERVERNAME as serverName');
    const serverInfo = result.recordset[0];

    // Test table access (if possible)
    let tableAccess = 'Unknown';
    try {
      await testPool.request().query('SELECT TOP 1 * FROM users');
      tableAccess = 'Full access to users table';
    } catch (tableError: any) {
      if (tableError.message.includes('Invalid object name')) {
        tableAccess = 'Users table not found';
      } else if (tableError.message.includes('permission')) {
        tableAccess = 'Limited permissions (no access to users table)';
      } else {
        tableAccess = `Table access error: ${tableError.message}`;
      }
    }

    await testPool.close();

    return {
      success: true,
      message: `Connection successful to ${params.server}`,
      connectionTime,
      serverInfo: {
        version: serverInfo.version,
        productName: serverInfo.serverName
      },
      details: {
        server: params.server,
        database: params.database,
        user: params.uid,
        tableAccess,
        connectionTime: `${connectionTime}ms`
      }
    };

  } catch (error: any) {
    console.error(`❌ Connection failed: ${error.message}`);

    // Close connection if it was opened
    if (testPool) {
      try {
        await testPool.close();
      } catch (closeError) {
        console.error('Error closing test connection:', closeError);
      }
    }

    const connectionTime = Date.now() - startTime;

    // Categorize error types for better user feedback
    let errorCategory = 'Unknown error';
    let troubleshooting = '';

    if (error.message.includes('getaddrinfo ENOTFOUND')) {
      errorCategory = 'Server not found (DNS resolution failed)';
      troubleshooting = 'Check server name and network connectivity';
    } else if (error.message.includes('Login failed')) {
      errorCategory = 'Authentication failed';
      troubleshooting = 'Check username and password';
    } else if (error.message.includes('Cannot open database')) {
      errorCategory = 'Database access denied';
      troubleshooting = 'Check database name and user permissions';
    } else if (error.message.includes('timeout')) {
      errorCategory = 'Connection timeout';
      troubleshooting = 'Check network connectivity and firewall settings';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorCategory = 'Connection refused';
      troubleshooting = 'Check if SQL Server is running and accepting connections';
    }

    // Run network diagnostics for DNS/connectivity issues
    let networkDiagnostics = null;
    if (error.message.includes('getaddrinfo ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('🔍 Running network diagnostics...');
      try {
        networkDiagnostics = await runNetworkDiagnostics(params.server);
      } catch (diagError) {
        console.error('Network diagnostics failed:', diagError);
      }
    }

    return {
      success: false,
      message: `Connection failed: ${errorCategory}`,
      connectionTime,
      error: error.message,
      details: {
        server: params.server,
        database: params.database,
        user: params.uid,
        errorCategory,
        troubleshooting,
        connectionTime: `${connectionTime}ms`,
        fullError: error.message,
        networkDiagnostics
      }
    };
  }
}

/**
 * Test connection with preset configurations
 */
export async function testPresetConnections(): Promise<ConnectionTestResult[]> {
  const presets = [
    {
      name: 'Authentication User (john)',
      server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
      database: 'InventoryDB',
      uid: process.env.SQL_AUTH_USER || 'john_login_user',
      pwd: process.env.SQL_AUTH_PASSWORD || 'StrongPassword1!'
    },
    {
      name: 'Admin Role',
      server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
      database: 'InventoryDB',
      uid: 'admin_user',
      pwd: process.env.SQL_ADMIN_PASSWORD || 'AdminPass123!'
    },
    {
      name: 'Inventory Operator Role',
      server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
      database: 'InventoryDB',
      uid: 'inventory_operator',
      pwd: process.env.SQL_INVENTORY_OPERATOR_PASSWORD || 'InventoryOp123!'
    }
  ];

  const results: ConnectionTestResult[] = [];

  for (const preset of presets) {
    console.log(`\n🧪 Testing ${preset.name}...`);
    const result = await testDatabaseConnection({
      server: preset.server,
      database: preset.database,
      uid: preset.uid,
      pwd: preset.pwd
    });
    
    results.push({
      ...result,
      message: `${preset.name}: ${result.message}`
    });
  }

  return results;
}

/**
 * Validate connection parameters
 */
export function validateConnectionParams(params: ConnectionTestParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.server || params.server.trim() === '') {
    errors.push('Server name is required');
  }

  if (!params.database || params.database.trim() === '') {
    errors.push('Database name is required');
  }

  if (!params.uid || params.uid.trim() === '') {
    errors.push('Username (UID) is required');
  }

  if (!params.pwd || params.pwd.trim() === '') {
    errors.push('Password (PWD) is required');
  }

  // Validate server format (basic check)
  if (params.server && !params.server.match(/^[a-zA-Z0-9\-_\\\.]+$/)) {
    errors.push('Server name contains invalid characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get connection status summary
 */
export async function getConnectionStatusSummary(): Promise<{
  authConnectionStatus: string;
  environment: {
    sqlServerMode: boolean;
    serverHost: string;
    database: string;
    authUser: string;
  };
  lastTestedAt: string;
}> {
  return {
    authConnectionStatus: 'Disconnected (expected in development)',
    environment: {
      sqlServerMode: process.env.SQL_SERVER === 'true',
      serverHost: process.env.SQL_SERVER_HOST || '163.227.186.23\\SQLEXPRESS',
      database: 'InventoryDB',
      authUser: process.env.SQL_AUTH_USER || 'john_login_user'
    },
    lastTestedAt: new Date().toISOString()
  };
}
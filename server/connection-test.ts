import { getSqlServerConnection, executeSqlQuery, testSqlServerConnection } from './sqlserver-connection';

/**
 * Comprehensive SQL Server connection test utility
 * Tests connection, database access, and table existence
 */
export async function checkSqlServerConnection(): Promise<{
  isConnected: boolean;
  status: string;
  details: any;
  error?: string;
}> {
  console.log('🔍 Testing SQL Server connection...');
  
  try {
    // Test 1: Basic connection
    const connectionTest = await testSqlServerConnection();
    if (!connectionTest) {
      return {
        isConnected: false,
        status: 'CONNECTION_FAILED',
        details: {
          server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
          database: process.env.SQL_DATABASE || 'InventoryDB',
          message: 'Cannot establish connection to SQL Server'
        },
        error: 'Failed to connect to SQL Server instance'
      };
    }

    // Test 2: Get connection details
    const connection = await getSqlServerConnection();
    if (!connection) {
      return {
        isConnected: false,
        status: 'CONNECTION_NULL',
        details: { message: 'Connection object is null' },
        error: 'SQL Server connection returned null'
      };
    }

    // Test 3: Check database and version
    const versionResult = await executeSqlQuery('SELECT @@VERSION as version, DB_NAME() as database_name');
    
    // Test 4: Check required tables exist
    const tablesResult = await executeSqlQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_NAME IN ('Users', 'Assets', 'Transfers', 'Repairs')
      ORDER BY TABLE_NAME
    `);

    // Test 5: Check Users table structure and data
    let userCount = 0;
    try {
      const userCountResult = await executeSqlQuery('SELECT COUNT(*) as count FROM Users');
      userCount = userCountResult.recordset[0].count;
    } catch (error) {
      // Users table might not exist
    }

    const requiredTables = ['Users', 'Assets', 'Transfers', 'Repairs'];
    const existingTables = tablesResult.recordset.map(row => row.TABLE_NAME);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    return {
      isConnected: true,
      status: missingTables.length > 0 ? 'CONNECTED_MISSING_TABLES' : 'FULLY_CONNECTED',
      details: {
        server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
        database: versionResult.recordset[0].database_name,
        version: versionResult.recordset[0].version.split('\n')[0],
        tablesFound: existingTables,
        missingTables: missingTables,
        userCount: userCount,
        connectionPool: {
          connected: connection.connected,
          connecting: connection.connecting
        }
      }
    };

  } catch (error) {
    return {
      isConnected: false,
      status: 'ERROR',
      details: {
        server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
        database: process.env.SQL_DATABASE || 'InventoryDB',
        errorType: error.constructor.name,
        errorCode: error.code || 'UNKNOWN'
      },
      error: error.message
    };
  }
}

/**
 * Quick connection check - returns boolean
 */
export async function isConnected(): Promise<boolean> {
  try {
    const result = await checkSqlServerConnection();
    return result.isConnected && result.status === 'FULLY_CONNECTED';
  } catch {
    return false;
  }
}

/**
 * Get connection status string for logging
 */
export async function getConnectionStatus(): Promise<string> {
  const result = await checkSqlServerConnection();
  
  if (result.isConnected) {
    return `✅ SQL Server connected to ${result.details.database} (${result.details.tablesFound.length}/4 tables found)`;
  } else {
    return `❌ SQL Server connection failed: ${result.error}`;
  }
}
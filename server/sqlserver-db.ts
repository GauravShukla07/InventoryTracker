import sql from 'mssql';

// SQL Server connection configuration - Update with your server details
// For production deployment, set these values in environment variables
const sqlServerConfig: sql.config = {
  server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
  database: process.env.SQL_DATABASE || 'InventoryDB',
  authentication: {
    type: 'ntlm',
    options: {
      domain: '', // Windows domain if needed
      userName: '', // Will use current Windows user
      password: ''
    }
  },
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: true, // Trust self-signed certificates
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Alternative connection using Windows Authentication
const sqlServerConfigWindows: sql.config = {
  server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
  database: process.env.SQL_DATABASE || 'InventoryDB',
  driver: 'msnodesqlv8', // For Windows Authentication
  options: {
    trustedConnection: true,
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  }
};

let pool: sql.ConnectionPool | null = null;

/**
 * Establishes a connection to the SQL Server database using Windows Authentication.
 * Equivalent to the Python get_db_connection() function.
 */
export async function getSqlServerConnection(): Promise<sql.ConnectionPool | null> {
  try {
    if (pool && pool.connected) {
      return pool;
    }

    // Try Windows Authentication first
    try {
      pool = await sql.connect(sqlServerConfigWindows);
      console.log('Connected to SQL Server using Windows Authentication');
      return pool;
    } catch (winAuthError) {
      console.log('Windows Authentication failed, trying NTLM:', winAuthError);
      
      // Fallback to NTLM
      pool = await sql.connect(sqlServerConfig);
      console.log('Connected to SQL Server using NTLM');
      return pool;
    }

  } catch (error) {
    console.error('Error connecting to SQL Server:', error);
    return null;
  }
}

/**
 * Closes the database connection safely.
 * Equivalent to the Python close_db_connection() function.
 */
export async function closeSqlServerConnection(): Promise<void> {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('SQL Server connection closed successfully.');
    }
  } catch (error) {
    console.error('Error closing SQL Server connection:', error);
  }
}

/**
 * Execute a SQL query on the SQL Server database
 */
export async function executeSqlQuery(query: string, params?: any[]): Promise<sql.IResult<any>> {
  const connection = await getSqlServerConnection();
  if (!connection) {
    throw new Error('Failed to establish SQL Server connection');
  }

  const request = connection.request();
  
  // Add parameters if provided
  if (params) {
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
  }

  return await request.query(query);
}

/**
 * Test the SQL Server connection
 */
export async function testSqlServerConnection(): Promise<boolean> {
  try {
    const connection = await getSqlServerConnection();
    if (!connection) {
      return false;
    }

    // Test with a simple query
    const result = await executeSqlQuery('SELECT 1 as test');
    return result.recordset.length > 0;
  } catch (error) {
    console.error('SQL Server connection test failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeSqlServerConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeSqlServerConnection();
  process.exit(0);
});
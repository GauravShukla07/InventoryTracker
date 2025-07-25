import sql from 'mssql';

/**
 * SQL Server Database Configuration and Connection Management
 * Connects to MS SQL Server using the provided connection string
 */

// SQL Server connection configuration
const sqlConfig: sql.config = {
  server: "WSERVER718623-I\\SQLEXPRESS",
  database: "InventoryDB",
  authentication: {
    type: "ntlm",
    options: {
      domain: "",
      userName: "",
      password: ""
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: "SQLEXPRESS"
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Connection pool
let poolPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Get SQL Server connection pool
 * Creates a new pool if one doesn't exist
 */
export const getPool = (): Promise<sql.ConnectionPool> => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(sqlConfig)
      .connect()
      .then(pool => {
        console.log('Connected to SQL Server');
        return pool;
      })
      .catch(err => {
        console.error('Database connection failed:', err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
};

/**
 * Execute a stored procedure with parameters
 * @param procedureName - Name of the stored procedure
 * @param parameters - Parameters to pass to the procedure
 * @returns Promise with the result set
 */
export const executeStoredProcedure = async (
  procedureName: string,
  parameters: { name: string; type: any; value: any }[] = []
): Promise<any> => {
  try {
    const pool = await getPool();
    const request = pool.request();

    // Add parameters to the request
    parameters.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.execute(procedureName);
    return result.recordset;
  } catch (error) {
    console.error(`Error executing stored procedure ${procedureName}:`, error);
    throw error;
  }
};

/**
 * Execute a raw SQL query (for setup/migration purposes only)
 * @param query - SQL query string
 * @param parameters - Query parameters
 * @returns Promise with the result set
 */
export const executeQuery = async (
  query: string,
  parameters: { name: string; type: any; value: any }[] = []
): Promise<any> => {
  try {
    const pool = await getPool();
    const request = pool.request();

    // Add parameters to the request
    parameters.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

/**
 * Close the database connection pool
 */
export const closePool = async (): Promise<void> => {
  try {
    if (poolPromise) {
      const pool = await poolPromise;
      await pool.close();
      poolPromise = null;
      console.log('SQL Server connection pool closed');
    }
  } catch (error) {
    console.error('Error closing connection pool:', error);
  }
};

// SQL Server data types for parameter binding
export const SqlTypes = sql.TYPES;

// Handle process termination
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
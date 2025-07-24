import sql from 'mssql';

/**
 * Connection Manager for Two-Tier Authentication System
 * 
 * 1. Initial connection with low-privilege user (john) for authentication
 * 2. Dynamic connection switching based on user role after login
 */

// Connection configurations
const SERVER_CONFIG = {
  server: '163.227.186.23',
  database: 'USE InventoryDB',
  port: 2499,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 60000,
    requestTimeout: 60000,
    multipleActiveResultSets: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Initial authentication user (read-only access to users table)
const AUTH_USER_CONFIG: sql.config = {
  ...SERVER_CONFIG,
  user: process.env.SQL_AUTH_USER || 'john_login_user',
  password: process.env.SQL_AUTH_PASSWORD || 'StrongPassword1!',
};

// Active connection pools by session
const sessionConnections = new Map<string, sql.ConnectionPool>();
let authConnection: sql.ConnectionPool | null = null;

/**
 * Initialize the authentication connection (john user)
 * This connection is used for login verification only
 */
export async function initializeAuthConnection(): Promise<sql.ConnectionPool | null> {
  try {
    if (authConnection && authConnection.connected) {
      return authConnection;
    }

    console.log('🔧 Initializing authentication connection as john_login_user...');
    authConnection = new sql.ConnectionPool(AUTH_USER_CONFIG);
    await authConnection.connect();
    
    console.log('✅ Authentication connection established');
    return authConnection;
    
  } catch (error: any) {
    console.error('❌ Failed to initialize authentication connection:', error.message);
    authConnection = null;
    return null;
  }
}

/**
 * Authenticate user and get their role/database user mapping
 */
export async function authenticateUser(emailOrUsername: string, password: string): Promise<{
  user: any;
  dbUser: string;
  dbPassword: string;
} | null> {
  try {
    const connection = await initializeAuthConnection();
    if (!connection) {
      throw new Error('Authentication connection not available');
    }

    console.log(`🔍 Authenticating user: ${emailOrUsername}`);
    
    // Query Users table with john's read-only access
    // Extract role (UID) and rolePassword (PWD) from Users table
    const result = await connection.request()
      .input('emailOrUsername', sql.VarChar, emailOrUsername)
      .input('password', sql.VarChar, password) // In production, this should be hashed
      .query(`
        SELECT 
          id, username, email, role, role_password as rolePassword, department, is_active as isActive, last_login as lastLogin
        FROM users 
        WHERE (email = @emailOrUsername OR username = @emailOrUsername) 
        AND password = @password 
        AND is_active = true
      `);

    if (result.recordset.length === 0) {
      console.log('❌ Authentication failed: Invalid credentials or inactive user');
      return null;
    }

    const user = result.recordset[0];
    console.log(`✅ User authenticated: ${user.username} (role: ${user.role})`);
    
    // Update last login timestamp
    await connection.request()
      .input('userId', sql.Int, user.id)
      .input('lastLogin', sql.DateTime, new Date())
      .query('UPDATE users SET last_login = @lastLogin WHERE id = @userId');

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      },
      dbUser: user.role, // UID = role column value
      dbPassword: user.rolePassword // PWD = rolePassword column value
    };

  } catch (error: any) {
    console.error('❌ Authentication error:', error.message);
    return null;
  }
}

/**
 * Create role-based connection for authenticated user
 */
export async function createUserConnection(sessionId: string, dbUser: string, dbPassword: string): Promise<sql.ConnectionPool | null> {
  try {
    // Close existing connection for this session
    await closeSessionConnection(sessionId);

    console.log(`🔄 Creating connection for user: ${dbUser}`);
    
    const userConfig: sql.config = {
      ...SERVER_CONFIG,
      user: dbUser,
      password: dbPassword,
    };

    const connection = new sql.ConnectionPool(userConfig);
    await connection.connect();
    
    // Store connection for this session
    sessionConnections.set(sessionId, connection);
    
    console.log(`✅ User connection established for: ${dbUser}`);
    return connection;
    
  } catch (error: any) {
    console.error(`❌ Failed to create user connection for ${dbUser}:`, error.message);
    return null;
  }
}

/**
 * Get connection for a specific session
 */
export function getSessionConnection(sessionId: string): sql.ConnectionPool | null {
  const connection = sessionConnections.get(sessionId);
  return (connection && connection.connected) ? connection : null;
}

/**
 * Get authentication connection (for user lookup only)
 */
export function getAuthConnection(): sql.ConnectionPool | null {
  return (authConnection && authConnection.connected) ? authConnection : null;
}

/**
 * Close connection for a specific session
 */
export async function closeSessionConnection(sessionId: string): Promise<void> {
  const connection = sessionConnections.get(sessionId);
  if (connection) {
    try {
      await connection.close();
      console.log(`🔌 Closed connection for session: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Error closing session connection: ${error}`);
    } finally {
      sessionConnections.delete(sessionId);
    }
  }
}

/**
 * Execute query with session-specific connection
 */
export async function executeUserQuery(sessionId: string, query: string, parameters?: any): Promise<sql.IResult<any>> {
  const connection = getSessionConnection(sessionId);
  if (!connection) {
    throw new Error('No active connection for session. User may need to re-authenticate.');
  }

  const request = connection.request();
  
  if (parameters) {
    Object.entries(parameters).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  return await request.query(query);
}

/**
 * Execute query with authentication connection (read-only operations)
 */
export async function executeAuthQuery(query: string, parameters?: any): Promise<sql.IResult<any>> {
  const connection = getAuthConnection();
  if (!connection) {
    throw new Error('Authentication connection not available');
  }

  const request = connection.request();
  
  if (parameters) {
    Object.entries(parameters).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  return await request.query(query);
}

/**
 * Get default password for role (in production, these should be from secure config)
 */
function getDefaultRolePassword(role: string): string {
  const rolePasswords: Record<string, string> = {
    'admin': process.env.SQL_ADMIN_PASSWORD || 'AdminPass123!',
    'manager': process.env.SQL_MANAGER_PASSWORD || 'ManagerPass123!',
    'operator': process.env.SQL_OPERATOR_PASSWORD || 'OperatorPass123!',
    'viewer': process.env.SQL_VIEWER_PASSWORD || 'ViewerPass123!',
    'inventory_operator': process.env.SQL_INVENTORY_OPERATOR_PASSWORD || 'InventoryOp123!',
    'admin_user': process.env.SQL_ADMIN_USER_PASSWORD || 'AdminUser123!',
  };
  
  return rolePasswords[role] || rolePasswords['viewer'];
}

/**
 * Test connection with specific credentials
 */
export async function testConnection(user: string, password: string): Promise<boolean> {
  try {
    const testConfig: sql.config = {
      ...SERVER_CONFIG,
      user,
      password,
    };

    const testPool = new sql.ConnectionPool(testConfig);
    await testPool.connect();
    await testPool.request().query('SELECT 1');
    await testPool.close();
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get connection status for all active sessions
 */
export function getConnectionStatus(): {
  authConnection: boolean;
  activeSessions: number;
  sessionList: string[];
} {
  return {
    authConnection: !!(authConnection && authConnection.connected),
    activeSessions: sessionConnections.size,
    sessionList: Array.from(sessionConnections.keys())
  };
}

/**
 * Close all connections gracefully
 */
export async function closeAllConnections(): Promise<void> {
  console.log('🔌 Closing all database connections...');
  
  // Close all session connections
  const sessionEntries = Array.from(sessionConnections.entries());
  for (const [sessionId, connection] of sessionEntries) {
    try {
      await connection.close();
      console.log(`Closed session connection: ${sessionId}`);
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }
  sessionConnections.clear();

  // Close auth connection
  if (authConnection) {
    try {
      await authConnection.close();
      console.log('Closed authentication connection');
    } catch (error) {
      console.error('Error closing auth connection:', error);
    }
    authConnection = null;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await closeAllConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeAllConnections();
  process.exit(0);
});
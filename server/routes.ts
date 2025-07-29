import { Router, Request, Response } from 'express';
import { RoleBasedSqlServerStorage } from './role-based-storage';
import { 
  getConnectionStatus, 
  getDefaultConnection, 
  closeSessionConnection 
} from './connection-manager.js';
import logger from '@shared/logger';


export interface AuthenticatedRequest extends Request {
  sessionId?: string;
}

const router = Router();

// **NEW: Connection status endpoint for utility pages**
router.get('/database/connections', (req: Request, res: Response) => {
  try {
    const status = getConnectionStatus();
    logger.info("📊 Connection status requested");
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      connections: {
        default: {
          established: status.defaultConnection.established,
          user: status.defaultConnection.user,
          database: status.defaultConnection.database,
          server: status.defaultConnection.server,
          purpose: 'Authentication and initial queries'
        },
        activeSessions: status.activeSessions,
        sessions: status.sessionList.map(session => ({
          sessionId: session.sessionId.substring(0, 8) + '...', // **Truncate for security**
          user: session.user,
          established: session.established,
          purpose: 'Role-based operations'
        }))
      }
    });
  } catch (error: any) {
    logger.error('❌ Error getting connection status:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get connection status',
      error: error.message
    });
  }
});

// **Enhanced: Test default connection endpoint**
router.post('/database/test-default', async (req: Request, res: Response) => {
  try {
    const connection = getDefaultConnection();
    
    if (!connection) {
      return res.status(503).json({
        success: false,
        message: 'Default SQL connection not available',
        suggestion: 'Server may need restart to establish connection'
      });
    }
    
    // **Test query**
    const result = await connection.request().query('SELECT 1 as test, GETDATE() as timestamp');
    
    res.json({
      success: true,
      message: 'Default connection is working',
      data: result.recordset[0],
      connectionDetails: {
        user: process.env.SQL_USER,
        database: process.env.SQL_DATABASE,
        server: process.env.SQL_SERVER_HOST
      }
    });
      
  } catch (error: any) {
    logger.error('❌ Default connection test failed:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Connection test failed',
      error: error.message
    });
  }
});


// Health check endpoint for deployment platforms
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    service: 'InventoryTracker API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Session tracking for authentication
const activeSessions = new Set<string>();
const sessionUsers = new Map<string, { userId: number; username: string; role: string }>();

// Simple session ID generator
function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Middleware to verify authentication (used for all protected routes)
const requireAuth = (req: AuthenticatedRequest, res: Response, next: Function) => {
  const sessionId = req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  req.sessionId = sessionId;
  next();
};

// PHASE 1: Authentication Routes
// Note: Frontend expects /api/auth/* endpoints, so we add both /auth/* and legacy /login

// New auth routes (expected by frontend)
// **Enhanced login to use cached default connection**
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    // **Check if default connection is available**
    const defaultConnection = getDefaultConnection();
    if (!defaultConnection) {
      logger.error('❌ Default connection not available for login');
      return res.status(503).json({ 
        message: 'Database connection not available. Please try again later.' 
      });
    }

    logger.info('🔐 Login attempt using cached default connection', { 
      email: email 
    });

    const sessionId = generateSessionId();
    const token = `token_${Date.now()}_${Math.random().toString(36)}`;
    
    const storage = new RoleBasedSqlServerStorage();
    const user = await storage.authenticateAndConnect(email, password, sessionId);
    
    if (user) {
      activeSessions.add(sessionId);
      
      // Store user info with session for /auth/me endpoint
      sessionUsers.set(sessionId, {
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      // **Store session info**
      req.session.sessionId = sessionId;
      req.session.userId = user.id;
      
      logger.info('✅ Login successful, role-based connection established', {
        user: user.username,
        role: user.role,
        sessionId: sessionId.substring(0, 8) + '...'
      });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        },
        sessionId: sessionId,
        token: token
      });
    } else {
      logger.warn('❌ Login failed: Invalid credentials', { 
        email: email.substring(0, 3) + '***' 
      });
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error: any) {
    logger.error('❌ Login error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// **Enhanced logout to properly manage connections**
router.post('/auth/logout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] as string || req.session.sessionId;
    
    if (sessionId) {
      activeSessions.delete(sessionId);
      sessionUsers.delete(sessionId); // Clean up user session data
      
      // **Close role-based connection, keep default connection**
      await closeSessionConnection(sessionId);
      
      // **Clear session data**
      req.session.destroy((err) => {
        if (err) {
          logger.error('❌ Session destruction error:', err);
        }
      });
      
      logger.info('🔌 User logged out, role-based connection closed', { 
        sessionId: sessionId.substring(0, 8) + '...' 
      });
      logger.info('🔗 Default connection remains active for new logins');
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('❌ Logout error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, invitationCode } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // TODO: Implement registration logic
    res.status(501).json({ message: 'Registration not yet implemented' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.sessionId!;
    logger.info('🔍 /auth/me endpoint called', { sessionId: sessionId.substring(0, 8) + '...' });
    
    // Get user info stored with the session
    const userInfo = sessionUsers.get(sessionId);
    if (!userInfo) {
      logger.warn('❌ No user info found for session', { sessionId: sessionId.substring(0, 8) + '...' });
      return res.status(401).json({ error: 'Session expired or invalid' });
    }
    
    // Get full user data from storage
    const storage = new RoleBasedSqlServerStorage();
    storage.setSessionId(sessionId);
    
    try {
      const user = await storage.getUser(userInfo.userId);
      if (!user) {
        logger.warn('❌ User not found in database', { userId: userInfo.userId });
        return res.status(401).json({ error: 'User not found' });
      }
      
      logger.info('✅ /auth/me successful', { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin || null,
          createdAt: user.createdAt
        }
      });
    } catch (dbError: any) {
      logger.error('❌ Database error in /auth/me:', { error: dbError.message });
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error: any) {
    logger.error('❌ /auth/me endpoint error:', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/auth/registration-status', (req: Request, res: Response) => {
  res.json({ registrationEnabled: true });
});



// PHASE 2: Asset Management Routes
router.get('/assets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.sessionId!;
    const storage = new RoleBasedSqlServerStorage();
    storage.setSessionId(sessionId);
    
    const assets = await storage.getAssets();
    res.json(assets);
  } catch (error: any) {
    console.error('Error getting assets:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/assets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.sessionId!;
    const storage = new RoleBasedSqlServerStorage();
    storage.setSessionId(sessionId);
    
    const asset = await storage.createAsset(req.body);
    res.status(201).json(asset);
  } catch (error: any) {
    console.error('Error creating asset:', error);
    if (error.message.includes('Insufficient privileges')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// User Management Routes
router.get('/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.sessionId!;
    const storage = new RoleBasedSqlServerStorage();
    storage.setSessionId(sessionId);
    
    const users = await storage.getUsers();
    res.json(users);
  } catch (error: any) {
    console.error('Error getting users:', error);
    if (error.message.includes('Insufficient privileges')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

router.post('/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.sessionId!;
    const storage = new RoleBasedSqlServerStorage();
    storage.setSessionId(sessionId);
    
    const user = await storage.createUser(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.message.includes('Insufficient privileges')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Additional placeholder routes for future implementation
router.put('/assets/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Update asset not implemented yet',
    phase: 'Phase 2 - Assets',
    status: 'Pending Implementation'
  });
});

router.delete('/assets/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Delete asset not implemented yet',
    phase: 'Phase 2 - Assets',
    status: 'Pending Implementation'
  });
});

router.put('/users/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Update user not implemented yet',
    phase: 'Phase 3 - Users',
    status: 'Pending Implementation'
  });
});

router.delete('/users/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Delete user not implemented yet',
    phase: 'Phase 3 - Users',
    status: 'Pending Implementation'
  });
});

// PHASE 4: Transfer Management Routes (Placeholders)
router.get('/transfers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Transfer management not implemented yet',
    phase: 'Phase 4 - Transfers',
    status: 'Pending Implementation'
  });
});

router.post('/transfers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Create transfer not implemented yet',
    phase: 'Phase 4 - Transfers',
    status: 'Pending Implementation'
  });
});

router.put('/transfers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Update transfer not implemented yet',
    phase: 'Phase 4 - Transfers',
    status: 'Pending Implementation'
  });
});

// PHASE 5: Repair Management Routes (Placeholders)
router.get('/repairs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Repair management not implemented yet',
    phase: 'Phase 5 - Repairs',
    status: 'Pending Implementation'
  });
});

router.post('/repairs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Create repair not implemented yet',
    phase: 'Phase 5 - Repairs',
    status: 'Pending Implementation'
  });
});

router.put('/repairs/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ 
    error: 'Update repair not implemented yet',
    phase: 'Phase 5 - Repairs',
    status: 'Pending Implementation'
  });
});

// Connection Utility Routes
import { testDatabaseConnection } from './connection-test-utility';

router.post('/database/test-connection', async (req: Request, res: Response) => {
  try {
    const result = await testDatabaseConnection(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/database/environment', (req: Request, res: Response) => {
  console.log("🌍 Environment endpoint called!");
  res.json({
    environment: {
      sqlServer: process.env.SQL_SERVER_HOST || 'not-set',
      database: process.env.SQL_DATABASE || 'not-set',
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

export default router;
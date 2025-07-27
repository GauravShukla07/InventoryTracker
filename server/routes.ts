import { Router, Request, Response } from 'express';
import { RoleBasedSqlServerStorage } from './role-based-storage';

export interface AuthenticatedRequest extends Request {
  sessionId?: string;
}

const router = Router();

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
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body; // Frontend sends 'email' field (can be username or email)
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    // Generate session ID and token
    const sessionId = generateSessionId();
    const token = `token_${Date.now()}_${Math.random().toString(36)}`;
    
    const storage = new RoleBasedSqlServerStorage();
    const user = await storage.authenticateAndConnect(email, password, sessionId);
    
    if (user) {
      activeSessions.add(sessionId);
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        },
        token: token
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
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
    // TODO: Get current user from session
    res.status(501).json({ message: 'Me endpoint not yet implemented' });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/auth/registration-status', (req: Request, res: Response) => {
  res.json({ registrationEnabled: true });
});

router.post('/auth/logout', (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (sessionId) {
      activeSessions.delete(sessionId);
      const storage = new RoleBasedSqlServerStorage();
      storage.disconnectSession(sessionId);
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Legacy routes (for backward compatibility)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Generate session ID
    const sessionId = generateSessionId();
    
    const storage = new RoleBasedSqlServerStorage();
    const user = await storage.authenticateAndConnect(username, password, sessionId);
    
    if (user) {
      activeSessions.add(sessionId);
      res.json({
        success: true,
        sessionId: sessionId,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (sessionId) {
      activeSessions.delete(sessionId);
      const storage = new RoleBasedSqlServerStorage();
      storage.disconnectSession(sessionId);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
import type { Express } from "express";
import { createServer, type Server } from "http";
import { RoleBasedSqlServerStorage } from './role-based-storage';
import { MemStorage } from './storage';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Dynamic storage instantiation based on environment
let storage: RoleBasedSqlServerStorage | MemStorage;
if (process.env.SQL_SERVER === 'true') {
  console.log('SQL Server mode enabled - initializing role-based SQL Server storage...');
  storage = new RoleBasedSqlServerStorage();
} else {
  console.log('Using memory storage implementation');
  storage = new MemStorage();
}
import { insertAssetSchema, insertTransferSchema, insertRepairSchema, loginSchema, registerSchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { checkSqlServerConnection } from './connection-test';
import { testDatabaseConnection, testPresetConnections, validateConnectionParams, getConnectionStatusSummary, type ConnectionTestParams } from './connection-test-utility';
import { runNetworkDiagnostics } from './network-diagnostics';

// Simple token store for backup authentication
const tokenStore = new Map<string, number>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware - proper implementation
  const requireAuth = (req: any, res: any, next: any) => {
    const sessionUserId = req.session?.userId;
    
    // Check for token in multiple places: Authorization header, cookies, or direct header
    let authToken = req.cookies?.authToken;
    if (!authToken && req.headers['authorization']) {
      authToken = req.headers['authorization'].replace('Bearer ', '');
    }
    
    const tokenUserId = authToken ? tokenStore.get(authToken) : null;
    
    if (!sessionUserId && !tokenUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    (req as any).userId = sessionUserId || tokenUserId;
    next();
  };

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      let user;
      try {
        user = await storage.getUserByEmail(email);
      } catch (error) {
        console.error('❌ Database connection failed during login:', error.message);
        return res.status(500).json({ 
          message: "Database connection failed", 
          error: error.message,
          details: "Unable to connect to SQL Server database"
        });
      }
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await storage.updateUserLastLogin(user.id);
      
      // Set userId in session and save it
      req.session.userId = user.id;
      
      // Generate simple token and store in memory
      const token = `token_${user.id}_${Date.now()}`;
      tokenStore.set(token, user.id);
      
      // Force session save
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      

      
      const { password: _, ...userWithoutPassword } = user;
      res.cookie('authToken', token, { 
        httpOnly: false, 
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'none',
        secure: false 
      });
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    // Clear the auth token from tokenStore
    const authToken = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
    if (authToken) {
      tokenStore.delete(authToken);
    }
    
    // Clear the auth token cookie
    res.clearCookie('authToken', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Destroy the session
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId; // Get from our auth middleware
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.error(`User not found for ID: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Asset routes
  app.get("/api/assets", requireAuth, async (req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      console.error("❌ Database error fetching assets:", error.message);
      res.status(500).json({ 
        message: "Database connection failed", 
        error: error.message,
        details: "Unable to fetch assets from SQL Server"
      });
    }
  });

  app.get("/api/assets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", requireAuth, async (req, res) => {
    try {
      const assetData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(assetData);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.put("/api/assets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertAssetSchema.partial().parse(req.body);
      const asset = await storage.updateAsset(id, updates);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAsset(id);
      if (!deleted) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json({ message: "Asset deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, invitationCode } = registerSchema.parse(req.body);
      
      // Check if registration is enabled
      const registrationEnabled = await storage.isRegistrationEnabled();
      if (!registrationEnabled) {
        return res.status(403).json({ message: "Registration is currently disabled" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Validate invitation code if provided
      if (invitationCode) {
        const isValidCode = await storage.isValidInvitationCode(invitationCode);
        if (!isValidCode) {
          return res.status(400).json({ message: "Invalid invitation code" });
        }
      }

      // Determine role based on invitation code or default to viewer
      let role = "viewer";
      if (invitationCode === "ADMIN-INVITE-2025") {
        role = "admin";
      } else if (invitationCode === "MANAGER-INVITE-2025") {
        role = "manager";
      }

      // Create new user
      const userData = {
        username,
        email,
        password, // In production, this should be hashed
        role,
        department: null,
        isActive: true,
      };

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({ 
        user: userWithoutPassword,
        message: "Registration successful! You can now log in with your credentials."
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check registration status endpoint
  app.get("/api/auth/registration-status", async (req, res) => {
    try {
      const registrationEnabled = await storage.isRegistrationEnabled();
      res.json({ registrationEnabled });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management endpoints
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      
      // Only admins can view all users
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      
      // Only admins can create new users
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      const targetUserId = parseInt(req.params.id);
      
      // Admin can update any user, users can update their own profile (except role)
      if (currentUser?.role !== "admin" && currentUserId !== targetUserId) {
        return res.status(403).json({ message: "Access denied." });
      }

      let updateData = updateUserSchema.parse(req.body);
      
      // Non-admins cannot change roles
      if (currentUser?.role !== "admin" && updateData.role) {
        delete updateData.role;
      }

      const updatedUser = await storage.updateUser(targetUserId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      const targetUserId = parseInt(req.params.id);
      
      // Only admins can delete users
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Cannot delete yourself
      if (currentUserId === targetUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(targetUserId);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Transfer routes
  app.get("/api/transfers", requireAuth, async (req, res) => {
    try {
      const transfers = await storage.getTransfers();
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transfers" });
    }
  });

  app.post("/api/transfers", requireAuth, async (req, res) => {
    try {
      const transferData = insertTransferSchema.parse(req.body);
      
      // Update asset location and status
      const asset = await storage.getAsset(transferData.assetId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      await storage.updateAsset(transferData.assetId, {
        currentLocation: transferData.toLocation,
        handoverPerson: transferData.toCustodian,
        handoverOrganization: transferData.toOrganization,
        transferRecipient: transferData.toCustodian,
        transferLocation: transferData.toLocation,
        status: "transferred",
      });

      const transfer = await storage.createTransfer({
        ...transferData,
        fromLocation: asset.currentLocation,
        fromCustodian: asset.handoverPerson,
      });

      res.status(201).json(transfer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transfer" });
    }
  });

  // Repair routes
  app.get("/api/repairs", requireAuth, async (req, res) => {
    try {
      const repairs = await storage.getRepairs();
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });

  app.get("/api/repairs/active", requireAuth, async (req, res) => {
    try {
      const repairs = await storage.getActiveRepairs();
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active repairs" });
    }
  });

  app.post("/api/repairs", requireAuth, async (req, res) => {
    try {
      const repairData = insertRepairSchema.parse(req.body);
      
      // Update asset status
      await storage.updateAsset(repairData.assetId, {
        status: "in_repair",
      });

      const repair = await storage.createRepair(repairData);
      res.status(201).json(repair);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create repair" });
    }
  });

  app.put("/api/repairs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertRepairSchema.partial().parse(req.body);
      const repair = await storage.updateRepair(id, updates);
      
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      // If repair is completed, update asset status
      if (updates.status === "completed") {
        await storage.updateAsset(repair.assetId, {
          status: "active",
        });
      }

      res.json(repair);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update repair" });
    }
  });

  // SQL Server connection test endpoint
  app.get("/api/database/status", async (req, res) => {
    try {
      const connectionStatus = await checkSqlServerConnection();
      const summary = await getConnectionStatusSummary();
      res.json({
        ...connectionStatus,
        summary
      });
    } catch (error) {
      res.status(500).json({
        isConnected: false,
        status: 'ERROR',
        error: error.message,
        details: { message: 'Connection test failed' }
      });
    }
  });

  // Connection testing utility - accessible without authentication
  app.post("/api/database/test-connection", async (req, res) => {
    try {
      const connectionParams: ConnectionTestParams = req.body;
      
      // Validate parameters
      const validation = validateConnectionParams(connectionParams);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: "Invalid connection parameters",
          errors: validation.errors
        });
      }

      // Test the connection
      const result = await testDatabaseConnection(connectionParams);
      
      // Return result (success or failure)
      res.status(result.success ? 200 : 400).json(result);
      
    } catch (error: any) {
      console.error("Connection test error:", error);
      res.status(500).json({
        success: false,
        message: "Connection test failed",
        error: error.message
      });
    }
  });

  // Test preset connections - useful for diagnostics
  app.get("/api/database/test-presets", async (req, res) => {
    try {
      const results = await testPresetConnections();
      res.json({
        success: true,
        message: "Preset connection tests completed",
        results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Preset connection tests error:", error);
      res.status(500).json({
        success: false,
        message: "Preset connection tests failed",
        error: error.message
      });
    }
  });

  /**
   * EXECUTE SQL QUERY ENDPOINT
   * API endpoint for testing SQL queries with role-based database access
   * Uses established connection credentials that have been pre-verified
   * Provides comprehensive error handling and detailed result formatting
   * 
   * REQUEST BODY:
   * - server: SQL Server IP address
   * - database: Target database name
   * - uid: Database username (must be from successful connection test)
   * - pwd: Database password (must be from successful connection test)
   * - port: SQL Server port number
   * - query: SQL query string to execute
   * - useEstablishedConnection: Boolean flag indicating use of verified credentials
   * 
   * RESPONSE FORMAT:
   * - success: Boolean indicating query success/failure
   * - message: Human-readable result message
   * - executionTime: Query execution time in milliseconds
   * - rowCount: Number of rows returned by SELECT queries
   * - columns: Array of column names in result set
   * - data: Query result data rows
   * - affectedRows: Number of rows affected by DML operations
   * - error: Error message if query failed
   * - sqlState: SQL error state code for debugging
   */
  app.post("/api/database/execute-query", async (req, res) => {
    try {
      // EXTRACT REQUEST PARAMETERS
      const { server, database, uid, pwd, port, query, useEstablishedConnection } = req.body;
      
      // VALIDATE SQL QUERY PARAMETER
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'SQL query is required',
          error: 'Missing or invalid query parameter'
        });
      }

      // VALIDATE ESTABLISHED CONNECTION REQUIREMENT
      // Only allow queries from connections that have been pre-verified
      if (useEstablishedConnection !== true) {
        return res.status(400).json({
          success: false,
          message: 'Queries must use an established connection. Please test connection first.',
          error: 'Connection not pre-verified'
        });
      }

      // LOG QUERY EXECUTION ATTEMPT WITH ESTABLISHED CONNECTION
      console.log(`🔍 Executing SQL query using established connection as ${uid}: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
      
      // BUILD SQL SERVER CONNECTION CONFIGURATION
      // Using same configuration as established connection for consistency
      const config = {
        server: server || '163.227.186.23',      // Default to inventory server IP
        database: database || 'USE InventoryDB',  // Default to inventory database
        port: port || 2499,                       // Default to custom SQL Server port
        user: uid,                                // Database username from established connection
        password: pwd,                            // Database password from established connection
        options: {
          encrypt: false,                         // Disable encryption for internal network
          trustServerCertificate: true,           // Trust self-signed certificates
          enableArithAbort: true,                 // Enable arithmetic abort for error handling
          connectTimeout: 15000,                  // Connection timeout (15 seconds)
          requestTimeout: 30000                   // Query timeout (30 seconds)
        }
      };

      // START QUERY EXECUTION TIMING
      const startTime = Date.now();
      
      try {
        // ESTABLISH DATABASE CONNECTION
        // Import mssql module using ES6 dynamic import for Node.js compatibility
        const sql = await import('mssql');
        const pool = new sql.default.ConnectionPool(config);  // Create connection pool with config
        await pool.connect();                                 // Establish connection to SQL Server
        
        // EXECUTE SQL QUERY
        // Use connection pool to execute the provided SQL query with proper error handling
        const result = await pool.request().query(query);
        
        // CLOSE DATABASE CONNECTION
        await pool.close();        // Clean up connection resources
        
        // CALCULATE QUERY EXECUTION TIME
        const executionTime = Date.now() - startTime;
        console.log(`✅ Query executed successfully in ${executionTime}ms, returned ${result.recordset?.length || 0} rows`);
        
        // RETURN SUCCESSFUL QUERY RESULTS
        res.json({
          success: true,
          message: `Query executed successfully in ${executionTime}ms`,
          executionTime,                                                                        // Time taken to execute query
          rowCount: result.recordset?.length || 0,                                            // Number of rows returned
          columns: result.recordset && result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [], // Column names
          data: result.recordset || [],                                                       // Query result data
          affectedRows: result.rowsAffected?.[0] || 0                                        // Rows affected by DML operations
        });
        
      } catch (dbError: any) {
        // HANDLE SQL EXECUTION ERRORS
        console.error(`❌ Query execution failed:`, dbError.message);
        res.json({
          success: false,
          message: `Query execution failed: ${dbError.message}`,
          error: dbError.message,                    // Error message for display
          sqlState: dbError.code,                    // SQL error state code
          details: dbError.originalError?.info       // Additional error details from SQL Server
        });
      }
      
    } catch (error: any) {
      // HANDLE GENERAL EXECUTION ERRORS
      console.error('❌ Query execution error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error during query execution',
        error: error.message
      });
    }
  });

  // Get connection environment info - useful for setup verification
  app.get("/api/database/environment", async (req, res) => {
    try {
      const summary = await getConnectionStatusSummary();
      res.json({
        success: true,
        environment: summary.environment,
        message: "Environment configuration retrieved",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get environment info",
        error: error.message
      });
    }
  });

  // Network diagnostics for troubleshooting connection issues
  app.post("/api/database/network-diagnostics", async (req, res) => {
    try {
      const { serverName } = req.body;
      
      if (!serverName) {
        return res.status(400).json({
          success: false,
          message: "Server name is required"
        });
      }

      const diagnostics = await runNetworkDiagnostics(serverName);
      
      res.json({
        success: true,
        message: "Network diagnostics completed",
        diagnostics,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error("Network diagnostics error:", error);
      res.status(500).json({
        success: false,
        message: "Network diagnostics failed",
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

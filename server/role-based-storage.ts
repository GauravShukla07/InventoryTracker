/**
 * FILE ROLE: Two-Tier Authentication Storage Implementation
 * 
 * ARCHITECTURE:
 * 1. Default connection: Uses cached default connection for authentication
 * 2. User authentication: Validates credentials against Users table
 * 3. Role extraction: Gets Role and rolePassword from matching user record
 * 4. Role connection: Establishes new connection with role-specific SQL user
 * 5. Privilege enforcement: Database-level access control via role-specific users
 * 
 * AUTHENTICATION FLOW:
 * Client → default connection → credential validation → role extraction → 
 * new role-based connection → privilege-enforced operations
 * 
 * DATABASE USERS:
 * - Default user: Read-only access to Users table for authentication
 * - admin: Full privileges on all tables
 * - manager: Asset, transfer, repair management privileges  
 * - operator: Asset creation and transfer privileges
 * - viewer: Read-only access to data
 * 
 * SECURITY FEATURES:
 * - Connection isolation per user session
 * - Database-level privilege enforcement
 * - Automatic connection cleanup on logout
 * - Role-based operation permissions
 */

// Import connection management functions for two-tier authentication
import { 
  initializeDefaultConnection, // Establishes default connection for authentication
  authenticateUser,           // Validates user credentials and extracts role information
  createUserConnection,       // Creates role-specific database connection
  getSessionConnection,       // Retrieves existing session connections
  getDefaultConnection,       // Gets the cached default connection
  closeSessionConnection     // Cleanup for session termination
} from './connection-manager';

// Import storage interface and schema types
import type { IStorage } from './storage-interface';
import type { 
  User, Asset, Transfer, Repair,
  InsertUser, InsertAsset, InsertTransfer, InsertRepair 
} from '@shared/schema-new';

import logger from '@shared/logger';

export class RoleBasedSqlServerStorage implements IStorage {
  private currentSessionId: string | null = null;

  constructor() {
    // Initialize authentication connection on startup
    this.initializeConnections();
  }

  private async initializeConnections(): Promise<void> {
    try {
      await initializeDefaultConnection();
      logger.info('🔧 Two-tier authentication storage initialized');
    } catch (error: any) {
      logger.error('Failed to initialize authentication system:', {
        error: error.message,
        stack: error.stack});
    }
  }

  /**
   * Set current session ID for connection management
   */
  setSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * CORE AUTHENTICATION METHOD
   * 
   * FLOW:
   * 1. Use john_login connection to validate credentials against Users table
   * 2. Extract Role and rolePassword from matching user record
   * 3. Close john_login connection
   * 4. Establish new connection using role-specific SQL user credentials
   * 5. Return authenticated user with role-based connection established
   */
  async authenticateAndConnect(emailOrUsername: string, password: string, sessionId: string): Promise<User | null> {
    try {
      logger.info(`🔐 Starting two-tier authentication for: ${emailOrUsername}`);
      
      // Step 1: Authenticate with john_login connection (read-only Users table access)
      const authResult = await authenticateUser(emailOrUsername, password);
      if (!authResult) {
        logger.error('❌ Authentication failed: Invalid credentials');
        return null;
      }
      
      // Step 2: Create role-specific connection using extracted credentials
      const userConnection = await createUserConnection(sessionId, authResult.dbUser, authResult.dbPassword);
      if (!userConnection) {
        throw new Error(`Failed to establish connection for role: ${authResult.user.role}`);
      }

      // Step 3: Set current session for subsequent operations
      this.setSessionId(sessionId);

      logger.info(`🎯 Role-based connection established. Session: ${sessionId}, Database User: ${authResult.dbUser}`);
      logger.info(`🛡️ Privilege enforcement active for role: ${authResult.user.role}`);

      return authResult.user;

    } catch (error: any) {
      logger.error('❌ Two-tier authentication failed:', error.message);
      // Cleanup any partial connections
      if (sessionId) {
        await this.disconnectSession(sessionId);
      }
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Close session connection and cleanup
   */
  async disconnectSession(sessionId: string): Promise<void> {
    try {
      await closeSessionConnection(sessionId);
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
      logger.info(`🔌 Session disconnected: ${sessionId}`);
    } catch (error: any) {
      logger.error('❌ Error disconnecting session:', error.message);
    }
  }

  // =============================================================================
  // USER MANAGEMENT METHODS
  // =============================================================================

  async getUser(id: number): Promise<User | undefined> {
    if (!this.currentSessionId) {
      throw new Error('No active session. User must be authenticated.');
    }
    
    try {
      // Use role-based connection for this operation
      const connection = getSessionConnection(this.currentSessionId);
      if (!connection) {
        throw new Error('Session connection not available');
      }
      
      const result = await connection.request()
        .input('userId', id)
        .query('SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive, createdAt, updatedAt FROM Users WHERE UserID = @userId');
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      logger.error('❌ Error in getUser:', error.message);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Use default connection for login verification
      const connection = getDefaultConnection();
      if (!connection) {
        throw new Error('Default connection not available');
      }
      
      const result = await connection.request()
        .input('email', email)
        .query('SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive, createdAt, updatedAt FROM users WHERE Email = @email');
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      logger.error('❌ Database error in getUserByEmail:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Use default connection for login verification
      const connection = getDefaultConnection();
      if (!connection) {
        throw new Error('Default connection not available');
      }
      
      const result = await connection.request()
        .input('username', username)
        .query('SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive, createdAt, updatedAt FROM users WHERE Username = @username');
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      logger.error('❌ Database error in getUserByUsername:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUsers(): Promise<User[]> {
    if (!this.currentSessionId) {
      throw new Error('No active session. User must be authenticated.');
    }
    
    try {
      // Use role-based connection - admin/manager privileges required at database level
      const connection = getSessionConnection(this.currentSessionId);
      if (!connection) {
        throw new Error('Session connection not available');
      }
      
      const result = await connection.request()
        .query('SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive, createdAt, updatedAt FROM users ORDER BY createdAt DESC');
      
      return result.recordset || [];
    } catch (error: any) {
      logger.error('❌ Error in getUsers:', error.message);
      // If user doesn't have privileges, SQL Server will deny access
      if (error.message.includes('permission') || error.message.includes('denied')) {
        throw new Error('Insufficient privileges to view users. Admin or Manager role required.');
      }
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    if (!this.currentSessionId) {
      throw new Error('No active session. User must be authenticated.');
    }
    
    try {
      // Use role-based connection - admin privileges required at database level
      const connection = getSessionConnection(this.currentSessionId);
      if (!connection) {
        throw new Error('Session connection not available');
      }
      
      const result = await connection.request()
        .input('username', userData.username)
        .input('email', userData.email)
        .input('password', userData.password) // Should be hashed in production
        .input('role', userData.role)
        .input('rolePassword', userData.rolePassword)
        .input('department', userData.department)
        .input('isActive', userData.isActive)
        .query(`INSERT INTO users (Username, Email, PasswordHash, Role, rolePassword, FullName, IsActive, createdAt, updatedAt)
         OUTPUT INSERTED.UserID as id, INSERTED.Username as username, INSERTED.Email as email, 
                INSERTED.Role as role, INSERTED.rolePassword, INSERTED.FullName as department, 
                INSERTED.IsActive as isActive, INSERTED.createdAt, INSERTED.updatedAt
         VALUES (@username, @email, @password, @role, @rolePassword, @department, @isActive, GETDATE(), GETDATE())`);
      
      if (result.recordset.length === 0) {
        throw new Error('Failed to create user - no record returned');
      }
      
      return result.recordset[0];
    } catch (error: any) {
      logger.error('❌ Error in createUser:', error.message);
      if (error.message.includes('permission') || error.message.includes('denied')) {
        throw new Error('Insufficient privileges to create users. Admin role required.');
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    // TODO: Implement with role-based connection
    // Requires admin privileges
    logger.info('📋 updateUser - To be implemented (requires admin role)');
    return undefined;
  }

  async deleteUser(id: number): Promise<void> {
    // TODO: Implement with role-based connection
    // Requires admin privileges
    logger.info('📋 deleteUser - To be implemented (requires admin role)');
  }

  async updateUserLastLogin(id: number): Promise<void> {
    // Skip - column doesn't exist in current database schema
    logger.warn('⚠️ Skipping lastLogin update - column not available in database');
    return;
  }

  // =============================================================================
  // ASSET MANAGEMENT METHODS
  // =============================================================================

  async getAssets(): Promise<Asset[]> {
    if (!this.currentSessionId) {
      throw new Error('No active session. User must be authenticated.');
    }
    
    try {
      // Use role-based connection - all authenticated users can view assets
      const connection = getSessionConnection(this.currentSessionId);
      if (!connection) {
        throw new Error('Session connection not available');
      }
      
      const result = await connection.request()
        .query('SELECT * FROM assets ORDER BY createdAt DESC');
      
      return result.recordset || [];
    } catch (error: any) {
      logger.error('❌ Error in getAssets:', error.message);
      throw new Error(`Failed to get assets: ${error.message}`);
    }
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    if (!this.currentSessionId) {
      throw new Error('No active session. User must be authenticated.');
    }
    
    try {
      // Use role-based connection for this operation
      const connection = getSessionConnection(this.currentSessionId);
      if (!connection) {
        throw new Error('Session connection not available');
      }
      
      const result = await connection.request()
        .input('assetId', id)
        .query('SELECT * FROM assets WHERE id = @assetId');
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      logger.error('❌ Error in getAsset:', error.message);
      throw new Error(`Failed to get asset: ${error.message}`);
    }
  }

  async createAsset(assetData: InsertAsset): Promise<Asset> {
    if (!this.currentSessionId) {
      throw new Error('No active session. User must be authenticated.');
    }
    
    try {
      // Use role-based connection - operator+ privileges required at database level
      const connection = getSessionConnection(this.currentSessionId);
      if (!connection) {
        throw new Error('Session connection not available');
      }
      
      const result = await connection.request()
        .input('voucherNo', assetData.voucherNo)
        .input('date', assetData.date)
        .input('donor', assetData.donor)
        .input('currentLocation', assetData.currentLocation)
        .input('lostQuantity', assetData.lostQuantity || 0)
        .input('lostAmount', assetData.lostAmount || 0)
        .input('handoverPerson', assetData.handoverPerson)
        .input('handoverOrganization', assetData.handoverOrganization)
        .input('transferRecipient', assetData.transferRecipient)
        .input('transferLocation', assetData.transferLocation)
        .input('isDonated', assetData.isDonated)
        .input('projectName', assetData.projectName)
        .input('isInsured', assetData.isInsured || false)
        .input('policyNumber', assetData.policyNumber)
        .input('warranty', assetData.warranty)
        .input('warrantyValidity', assetData.warrantyValidity)
        .input('grn', assetData.grn)
        .input('status', assetData.status || 'active')
        .query(`INSERT INTO assets (voucherNo, date, donor, currentLocation, lostQuantity, lostAmount, 
                            handoverPerson, handoverOrganization, transferRecipient, transferLocation, 
                            isDonated, projectName, isInsured, policyNumber, warranty, warrantyValidity, 
                            grn, status, createdAt, updatedAt)
         OUTPUT INSERTED.*
         VALUES (@voucherNo, @date, @donor, @currentLocation, @lostQuantity, @lostAmount,
                @handoverPerson, @handoverOrganization, @transferRecipient, @transferLocation,
                @isDonated, @projectName, @isInsured, @policyNumber, @warranty, @warrantyValidity,
                @grn, @status, GETDATE(), GETDATE())`);
      
      if (result.recordset.length === 0) {
        throw new Error('Failed to create asset - no record returned');
      }
      
      return result.recordset[0];
    } catch (error: any) {
      logger.error('❌ Error in createAsset:', error.message);
      if (error.message.includes('permission') || error.message.includes('denied')) {
        throw new Error('Insufficient privileges to create assets. Operator role or higher required.');
      }
      throw new Error(`Failed to create asset: ${error.message}`);
    }
  }

  async updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset | undefined> {
    // TODO: Implement with role-based connection
    // Requires operator/manager/admin privileges
    logger.info('📋 updateAsset - To be implemented (requires operator+ role)');
    return undefined;
  }

  async deleteAsset(id: number): Promise<void> {
    // TODO: Implement with role-based connection
    // Requires admin privileges
    logger.info('📋 deleteAsset - To be implemented (requires admin role)');
  }

  // =============================================================================
  // TRANSFER MANAGEMENT METHODS  
  // =============================================================================

  async getTransfers(): Promise<Transfer[]> {
    // TODO: Implement with role-based connection
    // All roles can view transfers
    logger.info('📋 getTransfers - To be implemented (all roles)');
    return [];
  }

  async getTransfer?(id: number): Promise<Transfer | undefined> {
    // TODO: Implement with role-based connection
    logger.info('📋 getTransfer - To be implemented (all roles)');
    return undefined;
  }

  async getTransfersByAsset?(assetId: number): Promise<Transfer[]> {
    // TODO: Implement with role-based connection
    logger.info('📋 getTransfersByAsset - To be implemented (all roles)');
    return [];
  }

  async createTransfer(transferData: InsertTransfer): Promise<Transfer> {
    // TODO: Implement with role-based connection
    // Requires operator/manager/admin privileges
    logger.info('📋 createTransfer - To be implemented (requires operator+ role)');
    throw new Error('Not implemented - requires operator+ privileges');
  }

  async updateTransfer?(id: number, updates: Partial<InsertTransfer>): Promise<Transfer | undefined> {
    // TODO: Implement with role-based connection
    logger.info('📋 updateTransfer - To be implemented (requires manager+ role)');
    return undefined;
  }

  async deleteTransfer?(id: number): Promise<boolean> {
    // TODO: Implement with role-based connection
    logger.info('📋 deleteTransfer - To be implemented (requires admin role)');
    return false;
  }

  // =============================================================================
  // REPAIR MANAGEMENT METHODS
  // =============================================================================

  async getRepairs(): Promise<Repair[]> {
    // TODO: Implement with role-based connection
    // All roles can view repairs
    logger.info('📋 getRepairs - To be implemented (all roles)');
    return [];
  }

  async getRepair?(id: number): Promise<Repair | undefined> {
    // TODO: Implement with role-based connection
    logger.info('📋 getRepair - To be implemented (all roles)');
    return undefined;
  }

  async getRepairsByAsset?(assetId: number): Promise<Repair[]> {
    // TODO: Implement with role-based connection
    logger.info('📋 getRepairsByAsset - To be implemented (all roles)');
    return [];
  }

  async createRepair(repairData: InsertRepair): Promise<Repair> {
    // TODO: Implement with role-based connection
    // Requires operator/manager/admin privileges
    logger.info('📋 createRepair - To be implemented (requires operator+ role)');
    throw new Error('Not implemented - requires operator+ privileges');
  }

  async updateRepair(id: number, updates: Partial<InsertRepair>): Promise<Repair | undefined> {
    // TODO: Implement with role-based connection
    logger.info('📋 updateRepair - To be implemented (requires operator+ role)');
    return undefined;
  }

  async deleteRepair?(id: number): Promise<boolean> {
    // TODO: Implement with role-based connection
    logger.info('📋 deleteRepair - To be implemented (requires admin role)');
    return false;
  }

  async getActiveRepairs(): Promise<Repair[]> {
    // TODO: Implement with role-based connection
    logger.info('📋 getActiveRepairs - To be implemented (all roles)');
    return [];
  }

  // =============================================================================
  // REGISTRATION AND CONFIGURATION
  // =============================================================================

  async isRegistrationEnabled(): Promise<boolean> {
    try {
      // Use default connection for configuration queries
      const connection = getDefaultConnection();
      if (!connection) {
        throw new Error('Default connection not available');
      }
      
      const result = await connection.request()
        .query("SELECT COUNT(*) as userCount FROM users WHERE role = 'admin'");
      
      // Registration enabled if no admin users exist
      return result.recordset[0].userCount === 0;
    } catch (error: any) {
      logger.error('❌ Database error checking registration status:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async isValidInvitationCode(code: string): Promise<boolean> {
    const validCodes = ['ADMIN-INVITE-2025', 'MANAGER-INVITE-2025'];
    return validCodes.includes(code);
  }
}
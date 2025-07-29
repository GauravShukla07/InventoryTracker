/**
 * FILE ROLE: Two-Tier Authentication Storage Implementation
 * 
 * ARCHITECTURE:
 * 1. Default connection: john_login (read-only access to Users table)
 * 2. User authentication: Validates credentials against Users table
 * 3. Role extraction: Gets Role and rolePassword from matching user ro  async createAsset(assetData: InsertAsset): Promise<Asset> {
    if (!this.currentSessionId) {
      throw new Error('No active session. User must be authenticated.');
    }
    
    try {
      // Use role-based connection - operator+ privileges required at database level
      const result = await executeUserQuery(
        this.currentSessionId,
        `INSERT INTO assets (voucherNo, date, donor, currentLocation, lostQuantity, lostAmount, 
                            handoverPerson, handoverOrganization, transferRecipient, transferLocation, 
                            isDonated, projectName, isInsured, policyNumber, warranty, warrantyValidity, 
                            grn, status, createdAt, updatedAt)
         OUTPUT INSERTED.*
         VALUES (@voucherNo, @date, @donor, @currentLocation, @lostQuantity, @lostAmount,
                @handoverPerson, @handoverOrganization, @transferRecipient, @transferLocation,
                @isDonated, @projectName, @isInsured, @policyNumber, @warranty, @warrantyValidity,
                @grn, @status, GETDATE(), GETDATE())`,
        {
          voucherNo: assetData.voucherNo,
          date: assetData.date,
          donor: assetData.donor,
          currentLocation: assetData.currentLocation,
          lostQuantity: assetData.lostQuantity || 0,
          lostAmount: assetData.lostAmount || 0,
          handoverPerson: assetData.handoverPerson,
          handoverOrganization: assetData.handoverOrganization,
          transferRecipient: assetData.transferRecipient,
          transferLocation: assetData.transferLocation,
          isDonated: assetData.isDonated,
          projectName: assetData.projectName,
          isInsured: assetData.isInsured || false,
          policyNumber: assetData.policyNumber,
          warranty: assetData.warranty,
          warrantyValidity: assetData.warrantyValidity,
          grn: assetData.grn,
          status: assetData.status || 'active'
        }
      );
      
      if (result.recordset.length === 0) {
        throw new Error('Failed to create asset - no record returned');
      }
      
      return result.recordset[0];
    } catch (error: any) {
      console.error('❌ Error in createAsset:', error.message);
      if (error.message.includes('permission') || error.message.includes('denied')) {
        throw new Error('Insufficient privileges to create assets. Operator role or higher required.');
      }
      throw new Error(`Failed to create asset: ${error.message}`);
    }
  }. Role connection: Establishes new connection with role-specific SQL user
 * 5. Privilege enforcement: Database-level access control via role-specific users
 * 
 * AUTHENTICATION FLOW:
 * Client → john_login connection → credential validation → role extraction → 
 * close john_login → new role-based connection → privilege-enforced operations
 * 
 * DATABASE USERS:
 * - john_login: Read-only access to Users table for authentication
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
  initializeAuthConnection,    // Establishes john_login connection for authentication
  authenticateUser,           // Validates user credentials and extracts role information
  createUserConnection,       // Creates role-specific database connection
  getSessionConnection,       // Retrieves existing session connections
  executeUserQuery,           // Executes queries with role-specific permissions
  executeAuthQuery,           // Executes authentication queries with minimal privileges
  closeSessionConnection     // Cleanup for session termination
} from './connection-manager';

// Import storage interface and schema types
import type { IStorage } from './storage-interface';
import type { 
  User, Asset, Transfer, Repair,
  InsertUser, InsertAsset, InsertTransfer, InsertRepair 
} from '@shared/schema-new';

import logger from './logger';

export class RoleBasedSqlServerStorage implements IStorage {
  private currentSessionId: string | null = null;

  constructor() {
    // Initialize authentication connection on startup
    this.initializeConnections();
  }

  private async initializeConnections(): Promise<void> {
    try {
      await initializeAuthConnection();
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

      logger.info(`✅ Credentials validated. User: ${authResult.user.username}, Role: ${authResult.user.role}`);
      
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
      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive, createdAt, updatedAt FROM Users WHERE UserID = @userId',
        { userId: id }
      );
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      logger.error('❌ Error in getUser:', error.message);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Use auth connection for login verification (john_login read-only access)
      const result = await executeAuthQuery(
        'SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive, createdAt, updatedAt FROM users WHERE Email = @email',
        { email }
      );
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      logger.error('❌ Database error in getUserByEmail:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Use auth connection for login verification (john_login read-only access)
      const result = await executeAuthQuery(
        'SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive, createdAt, updatedAt FROM users WHERE Username = @username',
        { username }
      );
      
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
      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, IsActive as isActive, createdAt, updatedAt FROM users ORDER BY createdAt DESC'
      );
      
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
      const result = await executeUserQuery(
        this.currentSessionId,
        `INSERT INTO users (Username, Email, PasswordHash, Role, rolePassword, FullName, IsActive, createdAt, updatedAt)
         OUTPUT INSERTED.UserID as id, INSERTED.Username as username, INSERTED.Email as email, 
                INSERTED.Role as role, INSERTED.rolePassword, INSERTED.FullName as department, 
                INSERTED.IsActive as isActive, INSERTED.createdAt, INSERTED.updatedAt
         VALUES (@username, @email, @password, @role, @rolePassword, @department, @isActive, GETDATE(), GETDATE())`,
        {
          username: userData.username,
          email: userData.email,
          password: userData.password, // Should be hashed in production
          role: userData.role,
          rolePassword: userData.rolePassword,
          department: userData.department,
          isActive: userData.isActive
        }
      );
      
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
      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT * FROM assets ORDER BY createdAt DESC'
      );
      
      return result.recordset || [];
    } catch (error: any) {
      logger.error('❌ Error in getAssets:', error.message);
      throw new Error(`Failed to get assets: ${error.message}`);
    }
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    // TODO: Implement with role-based connection
    // All roles can view individual assets
    logger.info('📋 getAsset - To be implemented (all roles)');
    return undefined;
  }

  async createAsset(assetData: InsertAsset): Promise<Asset> {
    // TODO: Implement with role-based connection
    // Requires operator/manager/admin privileges
    logger.info('📋 createAsset - To be implemented (requires operator+ role)');
    throw new Error('Not implemented - requires operator+ privileges');
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
      // Use auth connection for configuration queries (john_login read-only access)
      const result = await executeAuthQuery(
        "SELECT COUNT(*) as userCount FROM users WHERE role = 'admin'"
      );
      
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
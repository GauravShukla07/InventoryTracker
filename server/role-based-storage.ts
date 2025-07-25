/**
 * FILE ROLE: Role-Based SQL Server Storage Implementation
 * 
 * PURPOSE: 
 * Implements the IStorage interface using Microsoft SQL Server with a sophisticated
 * two-tier authentication system. Provides enterprise-grade security through role-based
 * database user connections while maintaining session isolation and proper privilege separation.
 * 
 * AUTHENTICATION FLOW:
 * 1. john_login_user validates credentials against Users table (minimal privileges)
 * 2. System extracts role and rolePassword from Users table
 * 3. Creates dedicated connection using role-specific database user
 * 4. All subsequent operations use role-specific connection with appropriate privileges
 * 
 * DATABASE SCHEMA MAPPING:
 * - UserID (int) → id (application ID)
 * - Username (varchar) → username (login identifier)
 * - Email (varchar) → email (contact information)
 * - Role (varchar) → role (application role: admin, manager, operator, viewer)
 * - FullName (varchar) → department (display name/department)
 * - PasswordHash (varchar) → password validation
 * - rolePassword (varchar) → database user password for role-specific connections
 * - IsActive (bit) → isActive (account status)
 * 
 * CONNECTION MANAGEMENT:
 * - Session-based connection pooling for scalability
 * - Automatic cleanup on session termination
 * - Role-specific privilege enforcement at database level
 * - Connection reuse for performance optimization
 * 
 * SECURITY FEATURES:
 * - Principle of least privilege through role-based database users
 * - Connection isolation between user sessions
 * - SQL injection prevention through parameterized queries
 * - Credential extraction from secure database storage
 */

// Import connection management functions for two-tier authentication
import { 
  initializeAuthConnection,    // Establishes john_login_user connection for authentication
  authenticateUser,           // Validates user credentials and extracts role information
  createUserConnection,       // Creates role-specific database connection
  getSessionConnection,       // Retrieves existing session connections
  executeUserQuery,           // Executes queries with role-specific permissions
  executeAuthQuery,           // Executes authentication queries with minimal privileges
  closeSessionConnection     // Cleanup for session termination
} from './connection-manager';

// Import storage interface and schema types
import type { IStorage } from './storage';              // Storage interface definition
import type { 
  User, Asset, Transfer, Repair,                        // Entity types for database operations
  InsertUser, InsertAsset, InsertTransfer, InsertRepair // Insert schema types for data validation
} from '@shared/schema';
export class RoleBasedSqlServerStorage implements IStorage {
  private currentSessionId: string | null = null;

  constructor() {
    // Initialize authentication connection on startup
    this.initializeConnections();
  }

  private async initializeConnections(): Promise<void> {
    try {
      await initializeAuthConnection();
      console.log('🔧 Role-based storage initialized with authentication connection');
    } catch (error) {
      console.error('❌ Failed to initialize role-based storage:', error);
    }
  }

  /**
   * Set current session ID for connection management
   */
  setSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * Authenticate user and establish role-based connection
   */
  async authenticateAndConnect(emailOrUsername: string, password: string, sessionId: string): Promise<User | null> {
    try {
      // Step 1: Authenticate with john's connection
      const authResult = await authenticateUser(emailOrUsername, password);
      if (!authResult) {
        return null;
      }

      // Step 2: Create role-based connection
      const userConnection = await createUserConnection(sessionId, authResult.dbUser, authResult.dbPassword);
      if (!userConnection) {
        throw new Error(`Failed to establish connection for role: ${authResult.dbUser}`);
      }

      // Step 3: Set current session
      this.setSessionId(sessionId);

      console.log(`✅ User ${authResult.user.username} connected with role: ${authResult.dbUser}`);
      return authResult.user;

    } catch (error: any) {
      console.error('❌ Authentication and connection failed:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Close session connection
   */
  async disconnectSession(sessionId: string): Promise<void> {
    await closeSessionConnection(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  // User management methods (using auth connection for read, session connection for write)
  
  async getUser(id: number): Promise<User | undefined> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT UserID as id, Username as username, Email as email, Role as role, FullName as department, IsActive as isActive FROM users WHERE UserID = @userId',
        { userId: id }
      );
      
      const user = result.recordset[0];
      if (user) {
        // Remove sensitive fields
        delete user.password;
        delete user.dbPassword;
      }
      
      return user || undefined;
    } catch (error: any) {
      console.error('Error getting user:', error.message);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Use auth connection for login verification
      const result = await executeAuthQuery(
        'SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, FullName as department, IsActive as isActive FROM users WHERE Email = @email',
        { email }
      );
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      console.error('❌ Database error in getUserByEmail:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Use auth connection for login verification
      const result = await executeAuthQuery(
        'SELECT UserID as id, Username as username, Email as email, Role as role, rolePassword, FullName as department, IsActive as isActive FROM users WHERE Username = @username',
        { username }
      );
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      console.error('❌ Database error in getUserByUsername:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT UserID as id, Username as username, Email as email, Role as role, FullName as department, IsActive as isActive FROM users ORDER BY Username'
      );
      
      return result.recordset;
    } catch (error: any) {
      console.error('Error getting users:', error.message);
      throw error;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        `INSERT INTO users (username, email, password, role, role_password, department, is_active)
         VALUES (@username, @email, @password, @role, @rolePassword, @department, @isActive)
         RETURNING *`,
        {
          username: userData.username,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          rolePassword: this.getRolePassword(userData.role), // rolePassword column stores PWD
          department: userData.department,
          isActive: userData.isActive
        }
      );
      
      const user = result.recordset[0];
      delete user.password;
      delete user.dbPassword;
      
      return user;
    } catch (error: any) {
      console.error('Error creating user:', error.message);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const setClause = Object.keys(updates)
        .map(key => `${key} = @${key}`)
        .join(', ');

      const result = await executeUserQuery(
        this.currentSessionId,
        `UPDATE users 
         SET ${setClause}
         WHERE id = @id
         RETURNING *`,
        { id, ...updates }
      );
      
      const user = result.recordset[0];
      if (user) {
        delete user.password;
        delete user.dbPassword;
      }
      
      return user || undefined;
    } catch (error: any) {
      console.error('Error updating user:', error.message);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'DELETE FROM users WHERE id = @id',
        { id }
      );
      
      return result.rowsAffected[0] > 0;
    } catch (error: any) {
      console.error('Error deleting user:', error.message);
      return false;
    }
  }

  // Asset management methods (require active session with appropriate role)
  
  async getAssets(): Promise<Asset[]> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT * FROM assets ORDER BY voucher_no'
      );
      
      return result.recordset;
    } catch (error: any) {
      console.error('❌ Database error fetching assets:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT * FROM assets WHERE id = @id',
        { id }
      );
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      console.error('Error getting asset:', error.message);
      return undefined;
    }
  }

  async createAsset(assetData: InsertAsset): Promise<Asset> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        `INSERT INTO assets (voucher_no, date, donor, current_location, status)
         VALUES (@voucherNo, @date, @donor, @currentLocation, @status)
         RETURNING *`,
        assetData
      );
      
      return result.recordset[0];
    } catch (error: any) {
      console.error('Error creating asset:', error.message);
      throw error;
    }
  }

  async updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset | undefined> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const setClause = Object.keys(updates)
        .map(key => `${key} = @${key}`)
        .join(', ');

      const result = await executeUserQuery(
        this.currentSessionId,
        `UPDATE assets 
         SET ${setClause}
         WHERE id = @id
         RETURNING *`,
        { id, ...updates }
      );
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      console.error('Error updating asset:', error.message);
      throw error;
    }
  }

  async deleteAsset(id: number): Promise<boolean> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'DELETE FROM assets WHERE id = @id',
        { id }
      );
      
      return result.rowsAffected[0] > 0;
    } catch (error: any) {
      console.error('Error deleting asset:', error.message);
      return false;
    }
  }

  // Transfer methods
  async getTransfers(): Promise<Transfer[]> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT * FROM transfers ORDER BY transfer_date DESC'
      );
      
      return result.recordset;
    } catch (error: any) {
      console.error('Error getting transfers:', error.message);
      throw error;
    }
  }

  async createTransfer(transferData: InsertTransfer): Promise<Transfer> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        `INSERT INTO transfers (asset_id, from_location, to_location, transfer_date, to_custodian, reason)
         VALUES (@assetId, @fromLocation, @toLocation, @transferDate, @toCustodian, @reason)
         RETURNING *`,
        transferData
      );
      
      return result.recordset[0];
    } catch (error: any) {
      console.error('Error creating transfer:', error.message);
      throw error;
    }
  }

  // Repair methods
  async getRepairs(): Promise<Repair[]> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT * FROM repairs ORDER BY sent_date DESC'
      );
      
      return result.recordset;
    } catch (error: any) {
      console.error('Error getting repairs:', error.message);
      throw error;
    }
  }

  async createRepair(repairData: InsertRepair): Promise<Repair> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        `INSERT INTO repairs (asset_id, issue, sent_date, expected_return_date, repair_center, status)
         VALUES (@assetId, @issue, @sentDate, @expectedReturnDate, @repairCenter, @status)
         RETURNING *`,
        repairData
      );
      
      return result.recordset[0];
    } catch (error: any) {
      console.error('Error creating repair:', error.message);
      throw error;
    }
  }

  async updateRepair(id: number, updates: Partial<InsertRepair>): Promise<Repair | undefined> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const setClause = Object.keys(updates)
        .map(key => `${key} = @${key}`)
        .join(', ');

      const result = await executeUserQuery(
        this.currentSessionId,
        `UPDATE repairs 
         SET ${setClause}
         WHERE id = @id
         RETURNING *`,
        { id, ...updates }
      );
      
      return result.recordset[0] || undefined;
    } catch (error: any) {
      console.error('Error updating repair:', error.message);
      throw error;
    }
  }

  // Additional required methods from IStorage interface
  async updateUserLastLogin(id: number): Promise<void> {
    // Skip last login update - column doesn't exist in SQL Server table
    console.log('⚠️ Skipping lastLogin update - column not available in database');
    return;
  }

  async getTransfersByAsset(assetId: number): Promise<Transfer[]> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT * FROM transfers WHERE asset_id = @assetId ORDER BY transfer_date DESC',
        { assetId }
      );
      
      return result.recordset;
    } catch (error: any) {
      console.error('Error getting transfers by asset:', error.message);
      return [];
    }
  }

  async getActiveRepairs(): Promise<Repair[]> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        "SELECT * FROM repairs WHERE status != 'completed' ORDER BY sent_date DESC"
      );
      
      return result.recordset;
    } catch (error: any) {
      console.error('Error getting active repairs:', error.message);
      return [];
    }
  }

  async getRepairsByAsset(assetId: number): Promise<Repair[]> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT * FROM repairs WHERE asset_id = @assetId ORDER BY sent_date DESC',
        { assetId }
      );
      
      return result.recordset;
    } catch (error: any) {
      console.error('Error getting repairs by asset:', error.message);
      return [];
    }
  }

  // Registration and configuration
  async isRegistrationEnabled(): Promise<boolean> {
    try {
      // Use auth connection for configuration queries
      const result = await executeAuthQuery(
        "SELECT COUNT(*) as userCount FROM users WHERE role = 'admin'"
      );
      
      return result.recordset[0].userCount === 0;
    } catch (error: any) {
      console.error('❌ Database error checking registration status:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async isValidInvitationCode(code: string): Promise<boolean> {
    const validCodes = ['ADMIN-INVITE-2025', 'MANAGER-INVITE-2025'];
    return validCodes.includes(code);
  }

  /**
   * Get password for role (should be from secure configuration)
   */
  private getRolePassword(role: string): string {
    const rolePasswords: Record<string, string> = {
      'admin': process.env.SQL_ADMIN_PASSWORD || 'AdminPass123!',
      'manager': process.env.SQL_MANAGER_PASSWORD || 'ManagerPass123!',
      'operator': process.env.SQL_OPERATOR_PASSWORD || 'OperatorPass123!',
      'viewer': process.env.SQL_VIEWER_PASSWORD || 'ViewerPass123!',
    };
    
    return rolePasswords[role] || rolePasswords['viewer'];
  }
}
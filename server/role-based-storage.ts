import { 
  initializeAuthConnection, 
  authenticateUser, 
  createUserConnection, 
  getSessionConnection,
  executeUserQuery, 
  executeAuthQuery,
  closeSessionConnection 
} from './connection-manager';
import type { IStorage } from './storage';
import type { 
  User, Asset, Transfer, Repair, 
  InsertUser, InsertAsset, InsertTransfer, InsertRepair 
} from '@shared/schema';

/**
 * Role-Based SQL Server Storage Implementation
 * 
 * Uses two-tier authentication:
 * 1. john_login_user for authentication queries
 * 2. Role-based users (admin, manager, operator, viewer) for operations
 */
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
        'SELECT * FROM Users WHERE id = @userId',
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
        'SELECT id, username, email, role, department, isActive, lastLogin FROM Users WHERE email = @email',
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
        'SELECT id, username, email, role, department, isActive, lastLogin FROM Users WHERE username = @username',
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
        'SELECT id, username, email, role, department, isActive, lastLogin FROM Users ORDER BY username'
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
        `INSERT INTO Users (username, email, password, role, department, isActive, dbUser, dbPassword)
         OUTPUT INSERTED.*
         VALUES (@username, @email, @password, @role, @department, @isActive, @dbUser, @dbPassword)`,
        {
          username: userData.username,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          department: userData.department,
          isActive: userData.isActive,
          dbUser: userData.role, // Map role to database user
          dbPassword: this.getRolePassword(userData.role)
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
        `UPDATE Users 
         SET ${setClause}
         OUTPUT INSERTED.*
         WHERE id = @id`,
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
        'DELETE FROM Users WHERE id = @id',
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
        'SELECT * FROM Assets ORDER BY name'
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
        'SELECT * FROM Assets WHERE id = @id',
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
        `INSERT INTO Assets (name, description, category, location, status, voucherNumber, donor, receivedDate, value)
         OUTPUT INSERTED.*
         VALUES (@name, @description, @category, @location, @status, @voucherNumber, @donor, @receivedDate, @value)`,
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
        `UPDATE Assets 
         SET ${setClause}
         OUTPUT INSERTED.*
         WHERE id = @id`,
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
        'DELETE FROM Assets WHERE id = @id',
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
        'SELECT * FROM Transfers ORDER BY transferDate DESC'
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
        `INSERT INTO Transfers (assetId, fromLocation, toLocation, transferDate, transferredBy, reason)
         OUTPUT INSERTED.*
         VALUES (@assetId, @fromLocation, @toLocation, @transferDate, @transferredBy, @reason)`,
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
        'SELECT * FROM Repairs ORDER BY sentDate DESC'
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
        `INSERT INTO Repairs (assetId, issue, sentDate, expectedReturn, repairShop, status)
         OUTPUT INSERTED.*
         VALUES (@assetId, @issue, @sentDate, @expectedReturn, @repairShop, @status)`,
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
        `UPDATE Repairs 
         SET ${setClause}
         OUTPUT INSERTED.*
         WHERE id = @id`,
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
    try {
      if (!this.currentSessionId) {
        // Use auth connection for this operation
        await executeAuthQuery(
          'UPDATE Users SET lastLogin = @lastLogin WHERE id = @id',
          { id, lastLogin: new Date() }
        );
        return;
      }

      await executeUserQuery(
        this.currentSessionId,
        'UPDATE Users SET lastLogin = @lastLogin WHERE id = @id',
        { id, lastLogin: new Date() }
      );
    } catch (error: any) {
      console.error('Error updating user last login:', error.message);
    }
  }

  async getTransfersByAsset(assetId: number): Promise<Transfer[]> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      const result = await executeUserQuery(
        this.currentSessionId,
        'SELECT * FROM Transfers WHERE assetId = @assetId ORDER BY transferDate DESC',
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
        "SELECT * FROM Repairs WHERE status != 'completed' ORDER BY sentDate DESC"
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
        'SELECT * FROM Repairs WHERE assetId = @assetId ORDER BY sentDate DESC',
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
        "SELECT COUNT(*) as userCount FROM Users WHERE role = 'admin'"
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
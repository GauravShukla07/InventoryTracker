import { executeSqlQuery, getSqlServerConnection } from './sqlserver-db';
import type { User, Asset, Transfer, Repair, InsertUser, InsertAsset, InsertTransfer, InsertRepair } from '@shared/schema';
import { IStorage } from './storage';

/**
 * SQL Server storage implementation that connects to the existing InventoryDB
 * This replaces the PostgreSQL storage while maintaining the same interface
 */
export class SqlServerStorage implements IStorage {
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await executeSqlQuery(
        'SELECT * FROM Users WHERE id = @param0',
        [id]
      );
      return result.recordset[0] || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await executeSqlQuery(
        'SELECT * FROM Users WHERE email = @param0',
        [email]
      );
      return result.recordset[0] || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await executeSqlQuery(
        'SELECT * FROM Users WHERE username = @param0',
        [username]
      );
      return result.recordset[0] || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await executeSqlQuery(`
        INSERT INTO Users (username, email, password, role, department, isActive)
        OUTPUT INSERTED.*
        VALUES (@param0, @param1, @param2, @param3, @param4, @param5)
      `, [user.username, user.email, user.password, user.role, user.department, user.isActive ?? true]);
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    try {
      const setParts: string[] = [];
      const params: any[] = [];
      let paramIndex = 0;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setParts.push(`${key} = @param${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (setParts.length === 0) {
        throw new Error('No fields to update');
      }

      params.push(id); // Add ID as last parameter

      const result = await executeSqlQuery(`
        UPDATE Users 
        SET ${setParts.join(', ')}, updatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @param${paramIndex}
      `, params);

      return result.recordset[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await executeSqlQuery('DELETE FROM Users WHERE id = @param0', [id]);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const result = await executeSqlQuery('SELECT * FROM Users ORDER BY createdAt DESC');
      return result.recordset;
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async updateUserLastLogin(id: number): Promise<void> {
    try {
      await executeSqlQuery(
        'UPDATE Users SET lastLogin = GETDATE(), updatedAt = GETDATE() WHERE id = @param0',
        [id]
      );
    } catch (error) {
      console.error('Error updating user last login:', error);
    }
  }

  // Asset methods
  async getAssets(): Promise<Asset[]> {
    try {
      const result = await executeSqlQuery('SELECT * FROM Assets ORDER BY createdAt DESC');
      return result.recordset;
    } catch (error) {
      console.error('Error getting assets:', error);
      return [];
    }
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    try {
      const result = await executeSqlQuery('SELECT * FROM Assets WHERE id = @param0', [id]);
      return result.recordset[0] || undefined;
    } catch (error) {
      console.error('Error getting asset:', error);
      return undefined;
    }
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    try {
      const result = await executeSqlQuery(`
        INSERT INTO Assets (
          voucherNo, date, donor, currentLocation, lostQuantity, lostAmount,
          handoverPerson, handoverOrganization, transferRecipient, transferLocation,
          isDonated, projectName, isInsured, policyNumber, warranty, warrantyValidity,
          grn, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @param0, @param1, @param2, @param3, @param4, @param5,
          @param6, @param7, @param8, @param9, @param10, @param11,
          @param12, @param13, @param14, @param15, @param16, @param17
        )
      `, [
        asset.voucherNo, asset.date, asset.donor, asset.currentLocation,
        asset.lostQuantity ?? 0, asset.lostAmount ?? '0.00',
        asset.handoverPerson, asset.handoverOrganization,
        asset.transferRecipient, asset.transferLocation, asset.isDonated,
        asset.projectName, asset.isInsured, asset.policyNumber,
        asset.warranty, asset.warrantyValidity, asset.grn, asset.status
      ]);

      return result.recordset[0];
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  }

  async updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset> {
    try {
      const setParts: string[] = [];
      const params: any[] = [];
      let paramIndex = 0;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setParts.push(`${key} = @param${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (setParts.length === 0) {
        throw new Error('No fields to update');
      }

      params.push(id);

      const result = await executeSqlQuery(`
        UPDATE Assets 
        SET ${setParts.join(', ')}, updatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @param${paramIndex}
      `, params);

      return result.recordset[0];
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  }

  async deleteAsset(id: number): Promise<void> {
    try {
      await executeSqlQuery('DELETE FROM Assets WHERE id = @param0', [id]);
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  }

  // Transfer methods
  async getTransfers(): Promise<Transfer[]> {
    try {
      const result = await executeSqlQuery('SELECT * FROM Transfers ORDER BY createdAt DESC');
      return result.recordset;
    } catch (error) {
      console.error('Error getting transfers:', error);
      return [];
    }
  }

  async createTransfer(transfer: InsertTransfer): Promise<Transfer> {
    try {
      const result = await executeSqlQuery(`
        INSERT INTO Transfers (assetId, fromLocation, toLocation, transferredBy, transferredTo, transferDate, reason, status)
        OUTPUT INSERTED.*
        VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7)
      `, [
        transfer.assetId, transfer.fromLocation, transfer.toLocation,
        transfer.transferredBy, transfer.transferredTo, transfer.transferDate,
        transfer.reason, transfer.status
      ]);

      return result.recordset[0];
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw error;
    }
  }

  // Repair methods
  async getRepairs(): Promise<Repair[]> {
    try {
      const result = await executeSqlQuery('SELECT * FROM Repairs ORDER BY createdAt DESC');
      return result.recordset;
    } catch (error) {
      console.error('Error getting repairs:', error);
      return [];
    }
  }

  async getActiveRepairs(): Promise<Repair[]> {
    try {
      const result = await executeSqlQuery(
        "SELECT * FROM Repairs WHERE status IN ('pending', 'in_progress') ORDER BY createdAt DESC"
      );
      return result.recordset;
    } catch (error) {
      console.error('Error getting active repairs:', error);
      return [];
    }
  }

  async createRepair(repair: InsertRepair): Promise<Repair> {
    try {
      const result = await executeSqlQuery(`
        INSERT INTO Repairs (assetId, issue, reportedBy, repairLocation, expectedReturnDate, actualReturnDate, cost, status, notes)
        OUTPUT INSERTED.*
        VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7, @param8)
      `, [
        repair.assetId, repair.issue, repair.reportedBy, repair.repairLocation,
        repair.expectedReturnDate, repair.actualReturnDate, repair.cost,
        repair.status, repair.notes
      ]);

      return result.recordset[0];
    } catch (error) {
      console.error('Error creating repair:', error);
      throw error;
    }
  }
}
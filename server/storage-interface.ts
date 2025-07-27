import type { User, Asset, Transfer, Repair, InsertUser, UpdateUser, InsertAsset, UpdateAsset, InsertTransfer, UpdateTransfer, InsertRepair, UpdateRepair } from '@shared/schema-new';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  updateUserLastLogin(id: number): Promise<void>;
  
  // Registration methods (optional - can return default values)
  isValidInvitationCode?(code: string): Promise<boolean>;
  isRegistrationEnabled?(): Promise<boolean>;

  // Asset methods
  getAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<void>;

  // Transfer methods
  getTransfers(): Promise<Transfer[]>;
  getTransfer?(id: number): Promise<Transfer | undefined>;
  getTransfersByAsset?(assetId: number): Promise<Transfer[]>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  updateTransfer?(id: number, updates: UpdateTransfer): Promise<Transfer | undefined>;
  deleteTransfer?(id: number): Promise<boolean>;

  // Repair methods
  getRepairs(): Promise<Repair[]>;
  getRepair?(id: number): Promise<Repair | undefined>;
  getRepairsByAsset?(assetId: number): Promise<Repair[]>;
  createRepair(repair: InsertRepair): Promise<Repair>;
  updateRepair?(id: number, updates: UpdateRepair): Promise<Repair | undefined>;
  deleteRepair?(id: number): Promise<boolean>;
  getActiveRepairs?(): Promise<Repair[]>;
}

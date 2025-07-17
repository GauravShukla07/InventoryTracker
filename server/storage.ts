import { users, assets, transfers, repairs, type User, type InsertUser, type UpdateUser, type Asset, type InsertAsset, type Transfer, type InsertTransfer, type Repair, type InsertRepair } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  updateUserLastLogin(id: number): Promise<void>;
  
  // Registration methods
  isValidInvitationCode(code: string): Promise<boolean>;
  isRegistrationEnabled(): Promise<boolean>;

  // Asset methods
  getAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;

  // Transfer methods
  getTransfers(): Promise<Transfer[]>;
  getTransfersByAsset(assetId: number): Promise<Transfer[]>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;

  // Repair methods
  getRepairs(): Promise<Repair[]>;
  getActiveRepairs(): Promise<Repair[]>;
  getRepairsByAsset(assetId: number): Promise<Repair[]>;
  createRepair(repair: InsertRepair): Promise<Repair>;
  updateRepair(id: number, updates: Partial<InsertRepair>): Promise<Repair | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assets: Map<number, Asset>;
  private transfers: Map<number, Transfer>;
  private repairs: Map<number, Repair>;
  private currentUserId: number;
  private currentAssetId: number;
  private currentTransferId: number;
  private currentRepairId: number;
  private validInvitationCodes: Set<string>;
  private registrationEnabled: boolean;

  constructor() {
    this.users = new Map();
    this.assets = new Map();
    this.transfers = new Map();
    this.repairs = new Map();
    this.currentUserId = 1;
    this.currentAssetId = 1;
    this.currentTransferId = 1;
    this.currentRepairId = 1;
    this.validInvitationCodes = new Set(["ADMIN-INVITE-2025", "MANAGER-INVITE-2025"]);
    this.registrationEnabled = true;

    // Create default admin user
    this.users.set(1, {
      id: 1,
      username: "admin",
      email: "admin@inventory.com",
      password: "password123", // In real app, this would be hashed
      role: "admin",
      department: "IT",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create sample users with different roles
    this.users.set(2, {
      id: 2,
      username: "manager",
      email: "manager@inventory.com",
      password: "manager123",
      role: "manager",
      department: "Operations",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.users.set(3, {
      id: 3,
      username: "operator",
      email: "operator@inventory.com", 
      password: "operator123",
      role: "operator",
      department: "Warehouse",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.users.set(4, {
      id: 4,
      username: "viewer",
      email: "viewer@inventory.com",
      password: "viewer123",
      role: "viewer",
      department: "Finance",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.currentUserId = 5;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password,
      role: insertUser.role || "viewer",
      department: insertUser.department || null,
      isActive: insertUser.isActive ?? true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: UpdateUser): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async updateUserLastLogin(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      this.users.set(id, user);
    }
  }

  // Registration methods
  async isValidInvitationCode(code: string): Promise<boolean> {
    return this.validInvitationCodes.has(code);
  }

  async isRegistrationEnabled(): Promise<boolean> {
    return this.registrationEnabled;
  }

  // Asset methods
  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const id = this.currentAssetId++;
    const now = new Date();
    const asset: Asset = {
      id,
      voucherNo: insertAsset.voucherNo,
      date: insertAsset.date,
      donor: insertAsset.donor,
      currentLocation: insertAsset.currentLocation,
      lostQuantity: insertAsset.lostQuantity ?? null,
      lostAmount: insertAsset.lostAmount ?? null,
      handoverPerson: insertAsset.handoverPerson ?? null,
      handoverOrganization: insertAsset.handoverOrganization ?? null,
      transferRecipient: insertAsset.transferRecipient ?? null,
      transferLocation: insertAsset.transferLocation ?? null,
      isDonated: insertAsset.isDonated ?? null,
      projectName: insertAsset.projectName ?? null,
      isInsured: insertAsset.isInsured ?? null,
      policyNumber: insertAsset.policyNumber ?? null,
      warranty: insertAsset.warranty ?? null,
      warrantyValidity: insertAsset.warrantyValidity ?? null,
      grn: insertAsset.grn ?? null,
      status: insertAsset.status || "active",
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(id, asset);
    return asset;
  }

  async updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset | undefined> {
    const asset = this.assets.get(id);
    if (!asset) return undefined;

    const updatedAsset: Asset = {
      ...asset,
      ...updates,
      updatedAt: new Date(),
    };
    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }

  async deleteAsset(id: number): Promise<boolean> {
    return this.assets.delete(id);
  }

  // Transfer methods
  async getTransfers(): Promise<Transfer[]> {
    return Array.from(this.transfers.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getTransfersByAsset(assetId: number): Promise<Transfer[]> {
    return Array.from(this.transfers.values())
      .filter(transfer => transfer.assetId === assetId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createTransfer(insertTransfer: InsertTransfer): Promise<Transfer> {
    const id = this.currentTransferId++;
    const transfer: Transfer = {
      id,
      assetId: insertTransfer.assetId,
      fromLocation: insertTransfer.fromLocation,
      toLocation: insertTransfer.toLocation,
      fromCustodian: insertTransfer.fromCustodian ?? null,
      toCustodian: insertTransfer.toCustodian,
      toOrganization: insertTransfer.toOrganization ?? null,
      reason: insertTransfer.reason ?? null,
      transferDate: insertTransfer.transferDate,
      createdAt: new Date(),
    };
    this.transfers.set(id, transfer);
    return transfer;
  }

  // Repair methods
  async getRepairs(): Promise<Repair[]> {
    return Array.from(this.repairs.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getActiveRepairs(): Promise<Repair[]> {
    return Array.from(this.repairs.values())
      .filter(repair => repair.status !== "completed")
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getRepairsByAsset(assetId: number): Promise<Repair[]> {
    return Array.from(this.repairs.values())
      .filter(repair => repair.assetId === assetId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createRepair(insertRepair: InsertRepair): Promise<Repair> {
    const id = this.currentRepairId++;
    const repair: Repair = {
      id,
      assetId: insertRepair.assetId,
      issue: insertRepair.issue,
      repairCenter: insertRepair.repairCenter ?? null,
      expectedReturnDate: insertRepair.expectedReturnDate ?? null,
      actualReturnDate: null,
      status: insertRepair.status || "in_repair",
      cost: null,
      sentDate: new Date(),
      createdAt: new Date(),
    };
    this.repairs.set(id, repair);
    return repair;
  }

  async updateRepair(id: number, updates: Partial<InsertRepair>): Promise<Repair | undefined> {
    const repair = this.repairs.get(id);
    if (!repair) return undefined;

    const updatedRepair: Repair = {
      ...repair,
      ...updates,
    };
    this.repairs.set(id, updatedRepair);
    return updatedRepair;
  }
}

export const storage = new MemStorage();

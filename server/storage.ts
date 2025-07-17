import { users, assets, transfers, repairs, type User, type InsertUser, type Asset, type InsertAsset, type Transfer, type InsertTransfer, type Repair, type InsertRepair } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;

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

  constructor() {
    this.users = new Map();
    this.assets = new Map();
    this.transfers = new Map();
    this.repairs = new Map();
    this.currentUserId = 1;
    this.currentAssetId = 1;
    this.currentTransferId = 1;
    this.currentRepairId = 1;

    // Create default admin user
    this.users.set(1, {
      id: 1,
      username: "admin",
      email: "admin@inventory.com",
      password: "password123", // In real app, this would be hashed
      lastLogin: null,
      createdAt: new Date(),
    });
    this.currentUserId = 2;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      this.users.set(id, user);
    }
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

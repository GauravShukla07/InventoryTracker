import { z } from "zod";

// TypeScript interfaces for SQL Server database entities
export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  rolePassword?: string | null;
  department?: string | null;
  isActive: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: number;
  voucherNo: string;
  date: Date;
  donor?: string | null;
  currentLocation: string;
  lostQuantity: number;
  lostAmount: number;
  handoverPerson?: string | null;
  handoverOrganization?: string | null;
  transferRecipient?: string | null;
  transferLocation?: string | null;
  isDonated?: boolean | null;
  projectName?: string | null;
  isInsured: boolean;
  policyNumber?: string | null;
  warranty?: string | null;
  warrantyValidity?: Date | null;
  grn?: string | null;
  status: AssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transfer {
  id: number;
  assetId: number;
  fromLocation: string;
  toLocation: string;
  transferDate: Date;
  reason?: string | null;
  approvedBy?: number | null;
  status: TransferStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Repair {
  id: number;
  assetId: number;
  description: string;
  cost?: number | null;
  repairDate: Date;
  completedDate?: Date | null;
  vendor?: string | null;
  status: RepairStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Type definitions for enums
export type UserRole = "admin" | "manager" | "operator" | "viewer";
export type AssetStatus = "active" | "transferred" | "in_repair" | "disposed";
export type TransferStatus = "pending" | "approved" | "completed" | "cancelled";
export type RepairStatus = "pending" | "in_progress" | "completed" | "cancelled";

// Zod validation schemas for API requests

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email().max(100),
  password: z.string().min(6),
  invitationCode: z.string().optional(),
});

export const insertUserSchema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email().max(100),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "operator", "viewer"]).default("viewer"),
  rolePassword: z.string().optional(),
  department: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  email: z.string().email().max(100).optional(),
  role: z.enum(["admin", "manager", "operator", "viewer"]).optional(),
  rolePassword: z.string().optional(),
  department: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

export const insertAssetSchema = z.object({
  voucherNo: z.string().min(1).max(255),
  date: z.date(),
  donor: z.string().max(255).optional(),
  currentLocation: z.string().min(1).max(255),
  lostQuantity: z.number().int().min(0).default(0),
  lostAmount: z.number().min(0).default(0),
  handoverPerson: z.string().max(255).optional(),
  handoverOrganization: z.string().max(255).optional(),
  transferRecipient: z.string().max(255).optional(),
  transferLocation: z.string().max(255).optional(),
  isDonated: z.boolean().optional(),
  projectName: z.string().max(255).optional(),
  isInsured: z.boolean().default(false),
  policyNumber: z.string().max(255).optional(),
  warranty: z.string().max(255).optional(),
  warrantyValidity: z.date().optional(),
  grn: z.string().max(255).optional(),
  status: z.enum(["active", "transferred", "in_repair", "disposed"]).default("active"),
});

export const updateAssetSchema = insertAssetSchema.partial();

export const insertTransferSchema = z.object({
  assetId: z.number().int().positive(),
  fromLocation: z.string().min(1).max(255),
  toLocation: z.string().min(1).max(255),
  transferDate: z.date(),
  reason: z.string().max(500).optional(),
  approvedBy: z.number().int().positive().optional(),
  status: z.enum(["pending", "approved", "completed", "cancelled"]).default("pending"),
  notes: z.string().max(1000).optional(),
});

export const updateTransferSchema = insertTransferSchema.partial();

export const insertRepairSchema = z.object({
  assetId: z.number().int().positive(),
  description: z.string().min(1).max(1000),
  cost: z.number().min(0).optional(),
  repairDate: z.date(),
  completedDate: z.date().optional(),
  vendor: z.string().max(255).optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  notes: z.string().max(1000).optional(),
});

export const updateRepairSchema = insertRepairSchema.partial();

// Type exports for use in components
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type UpdateAsset = z.infer<typeof updateAssetSchema>;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type UpdateTransfer = z.infer<typeof updateTransferSchema>;
export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type UpdateRepair = z.infer<typeof updateRepairSchema>;

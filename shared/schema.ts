import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  voucherNo: text("voucher_no").notNull().unique(),
  date: timestamp("date").notNull(),
  donor: text("donor").notNull(),
  currentLocation: text("current_location").notNull(),
  lostQuantity: integer("lost_quantity").default(0),
  lostAmount: numeric("lost_amount", { precision: 10, scale: 2 }).default("0"),
  handoverPerson: text("handover_person"),
  handoverOrganization: text("handover_organization"),
  transferRecipient: text("transfer_recipient"),
  transferLocation: text("transfer_location"),
  isDonated: boolean("is_donated"),
  projectName: text("project_name"),
  isInsured: boolean("is_insured"),
  policyNumber: text("policy_number"),
  warranty: text("warranty"),
  warrantyValidity: timestamp("warranty_validity"),
  grn: text("grn"),
  status: text("status").notNull().default("active"), // active, transferred, in_repair, disposed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull(),
  fromLocation: text("from_location").notNull(),
  toLocation: text("to_location").notNull(),
  fromCustodian: text("from_custodian"),
  toCustodian: text("to_custodian").notNull(),
  toOrganization: text("to_organization"),
  reason: text("reason"),
  transferDate: timestamp("transfer_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull(),
  issue: text("issue").notNull(),
  repairCenter: text("repair_center"),
  expectedReturnDate: timestamp("expected_return_date"),
  actualReturnDate: timestamp("actual_return_date"),
  status: text("status").notNull().default("in_repair"), // in_repair, diagnosed, completed
  cost: numeric("cost", { precision: 10, scale: 2 }),
  sentDate: timestamp("sent_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.string().transform((str) => new Date(str)),
  warrantyValidity: z.string().optional().transform((str) => str ? new Date(str) : undefined),
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  createdAt: true,
}).extend({
  transferDate: z.string().transform((str) => new Date(str)),
});

export const insertRepairSchema = createInsertSchema(repairs).omit({
  id: true,
  createdAt: true,
  sentDate: true,
}).extend({
  expectedReturnDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfers.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type Repair = typeof repairs.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

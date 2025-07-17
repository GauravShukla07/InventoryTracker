import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("viewer"), // admin, manager, operator, viewer
  department: text("department"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  transfers: many(transfers),
  repairs: many(repairs),
}));

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

// Relations
export const assetsRelations = relations(assets, ({ many }) => ({
  transfers: many(transfers),
  repairs: many(repairs),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  asset: one(assets, {
    fields: [transfers.assetId],
    references: [assets.id],
  }),
}));

export const repairsRelations = relations(repairs, ({ one }) => ({
  asset: one(assets, {
    fields: [repairs.assetId],
    references: [assets.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  password: true,
}).partial();

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

export const registerSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  invitationCode: z.string().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = "admin" | "manager" | "operator" | "viewer";
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfers.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type Repair = typeof repairs.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

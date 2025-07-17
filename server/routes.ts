import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAssetSchema, insertTransferSchema, insertRepairSchema, loginSchema, registerSchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await storage.updateUserLastLogin(user.id);
      (req.session as any).userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Asset routes
  app.get("/api/assets", requireAuth, async (req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", requireAuth, async (req, res) => {
    try {
      const assetData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(assetData);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.put("/api/assets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertAssetSchema.partial().parse(req.body);
      const asset = await storage.updateAsset(id, updates);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAsset(id);
      if (!deleted) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json({ message: "Asset deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, invitationCode } = registerSchema.parse(req.body);
      
      // Check if registration is enabled
      const registrationEnabled = await storage.isRegistrationEnabled();
      if (!registrationEnabled) {
        return res.status(403).json({ message: "Registration is currently disabled" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Validate invitation code if provided
      if (invitationCode) {
        const isValidCode = await storage.isValidInvitationCode(invitationCode);
        if (!isValidCode) {
          return res.status(400).json({ message: "Invalid invitation code" });
        }
      }

      // Determine role based on invitation code or default to viewer
      let role = "viewer";
      if (invitationCode === "ADMIN-INVITE-2025") {
        role = "admin";
      } else if (invitationCode === "MANAGER-INVITE-2025") {
        role = "manager";
      }

      // Create new user
      const userData = {
        username,
        email,
        password, // In production, this should be hashed
        role,
        department: null,
        isActive: true,
      };

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({ 
        user: userWithoutPassword,
        message: "Registration successful! You can now log in with your credentials."
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check registration status endpoint
  app.get("/api/auth/registration-status", async (req, res) => {
    try {
      const registrationEnabled = await storage.isRegistrationEnabled();
      res.json({ registrationEnabled });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management endpoints
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      
      // Only admins can view all users
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      
      // Only admins can create new users
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      const targetUserId = parseInt(req.params.id);
      
      // Admin can update any user, users can update their own profile (except role)
      if (currentUser?.role !== "admin" && currentUserId !== targetUserId) {
        return res.status(403).json({ message: "Access denied." });
      }

      let updateData = updateUserSchema.parse(req.body);
      
      // Non-admins cannot change roles
      if (currentUser?.role !== "admin" && updateData.role) {
        delete updateData.role;
      }

      const updatedUser = await storage.updateUser(targetUserId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      const targetUserId = parseInt(req.params.id);
      
      // Only admins can delete users
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Cannot delete yourself
      if (currentUserId === targetUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(targetUserId);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Transfer routes
  app.get("/api/transfers", requireAuth, async (req, res) => {
    try {
      const transfers = await storage.getTransfers();
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transfers" });
    }
  });

  app.post("/api/transfers", requireAuth, async (req, res) => {
    try {
      const transferData = insertTransferSchema.parse(req.body);
      
      // Update asset location and status
      const asset = await storage.getAsset(transferData.assetId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      await storage.updateAsset(transferData.assetId, {
        currentLocation: transferData.toLocation,
        handoverPerson: transferData.toCustodian,
        handoverOrganization: transferData.toOrganization,
        transferRecipient: transferData.toCustodian,
        transferLocation: transferData.toLocation,
        status: "transferred",
      });

      const transfer = await storage.createTransfer({
        ...transferData,
        fromLocation: asset.currentLocation,
        fromCustodian: asset.handoverPerson,
      });

      res.status(201).json(transfer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transfer" });
    }
  });

  // Repair routes
  app.get("/api/repairs", requireAuth, async (req, res) => {
    try {
      const repairs = await storage.getRepairs();
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });

  app.get("/api/repairs/active", requireAuth, async (req, res) => {
    try {
      const repairs = await storage.getActiveRepairs();
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active repairs" });
    }
  });

  app.post("/api/repairs", requireAuth, async (req, res) => {
    try {
      const repairData = insertRepairSchema.parse(req.body);
      
      // Update asset status
      await storage.updateAsset(repairData.assetId, {
        status: "in_repair",
      });

      const repair = await storage.createRepair(repairData);
      res.status(201).json(repair);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create repair" });
    }
  });

  app.put("/api/repairs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertRepairSchema.partial().parse(req.body);
      const repair = await storage.updateRepair(id, updates);
      
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      // If repair is completed, update asset status
      if (updates.status === "completed") {
        await storage.updateAsset(repair.assetId, {
          status: "active",
        });
      }

      res.json(repair);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update repair" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

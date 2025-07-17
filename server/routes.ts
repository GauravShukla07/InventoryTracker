import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAssetSchema, insertTransferSchema, insertRepairSchema, loginSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
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
      req.session.userId = user.id;
      
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
      const user = await storage.getUser(req.session.userId);
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

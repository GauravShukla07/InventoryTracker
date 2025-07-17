-- SQL Server Database Schema for Inventory Management System
-- Based on the existing PostgreSQL schema, converted for SQL Server

USE InventoryDB;
GO

-- Create Users table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(255) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    department NVARCHAR(255),
    isActive BIT NOT NULL DEFAULT 1,
    lastLogin DATETIME2,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
END
GO

-- Create Assets table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Assets' AND xtype='U')
BEGIN
CREATE TABLE Assets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    voucherNo NVARCHAR(255) NOT NULL UNIQUE,
    date DATE NOT NULL,
    donor NVARCHAR(255),
    currentLocation NVARCHAR(255) NOT NULL,
    lostQuantity INT NOT NULL DEFAULT 0,
    lostAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    handoverPerson NVARCHAR(255),
    handoverOrganization NVARCHAR(255),
    transferRecipient NVARCHAR(255),
    transferLocation NVARCHAR(255),
    isDonated BIT,
    projectName NVARCHAR(255),
    isInsured BIT NOT NULL DEFAULT 0,
    policyNumber NVARCHAR(255),
    warranty NVARCHAR(255),
    warrantyValidity DATE,
    grn NVARCHAR(255),
    status NVARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disposed', 'lost', 'under_repair')),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
END
GO

-- Create Transfers table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Transfers' AND xtype='U')
BEGIN
CREATE TABLE Transfers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    assetId INT NOT NULL,
    fromLocation NVARCHAR(255) NOT NULL,
    toLocation NVARCHAR(255) NOT NULL,
    transferredBy NVARCHAR(255) NOT NULL,
    transferredTo NVARCHAR(255) NOT NULL,
    transferDate DATE NOT NULL,
    reason NVARCHAR(255),
    status NVARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (assetId) REFERENCES Assets(id) ON DELETE CASCADE
);
END
GO

-- Create Repairs table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Repairs' AND xtype='U')
BEGIN
CREATE TABLE Repairs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    assetId INT NOT NULL,
    issue NVARCHAR(255) NOT NULL,
    reportedBy NVARCHAR(255) NOT NULL,
    repairLocation NVARCHAR(255),
    expectedReturnDate DATE,
    actualReturnDate DATE,
    cost DECIMAL(12,2),
    status NVARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes NTEXT,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (assetId) REFERENCES Assets(id) ON DELETE CASCADE
);
END
GO

-- Create indexes for better performance
CREATE NONCLUSTERED INDEX IX_Assets_Status ON Assets(status);
CREATE NONCLUSTERED INDEX IX_Assets_Location ON Assets(currentLocation);
CREATE NONCLUSTERED INDEX IX_Transfers_AssetId ON Transfers(assetId);
CREATE NONCLUSTERED INDEX IX_Repairs_AssetId ON Repairs(assetId);
CREATE NONCLUSTERED INDEX IX_Repairs_Status ON Repairs(status);
GO

-- Insert demo users if they don't exist
IF NOT EXISTS (SELECT * FROM Users WHERE email = 'admin@inventory.com')
BEGIN
INSERT INTO Users (username, email, password, role, isActive) VALUES
('admin', 'admin@inventory.com', 'password123', 'admin', 1),
('manager', 'manager@inventory.com', 'manager123', 'manager', 1),
('operator', 'operator@inventory.com', 'operator123', 'operator', 1),
('viewer', 'viewer@inventory.com', 'viewer123', 'viewer', 1);
END
GO

-- Insert demo assets if they don't exist
IF NOT EXISTS (SELECT * FROM Assets WHERE voucherNo = 'LAPTOP-001')
BEGIN
INSERT INTO Assets (voucherNo, date, donor, currentLocation, handoverPerson, handoverOrganization, projectName, isInsured, warranty, grn, status) VALUES
('LAPTOP-001', '2024-01-15', 'IT Department', 'Main Office Floor 3', 'John Smith', 'Tech Solutions Inc', 'Digital Transformation', 1, '3 years manufacturer warranty', 'GRN-2024-001', 'active'),
('DESK-001', '2024-01-15', 'Office Supplies', 'Main Office', 'Alice Johnson', 'Facilities', 'Office Setup', 1, '2 years', 'GRN-2024-002', 'active'),
('CHAIR-001', '2024-02-01', 'Furniture Corp', 'Meeting Room A', 'Bob Wilson', 'Admin', 'Office Furniture', 0, '1 year', 'GRN-2024-003', 'active'),
('PRINTER-001', '2024-02-15', 'HP Inc', 'Print Center', 'Carol Davis', 'IT Support', 'Print Infrastructure', 1, '3 years', 'GRN-2024-004', 'active'),
('MONITOR-001', '2024-03-01', 'Dell Technologies', 'Workstation 15', 'David Lee', 'IT Department', 'Display Upgrade', 1, '2 years', 'GRN-2024-005', 'active');
END
GO

PRINT 'SQL Server schema setup completed successfully!';
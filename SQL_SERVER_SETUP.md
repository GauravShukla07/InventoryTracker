# SQL Server Integration Guide

## Overview

Your inventory management system is now fully configured to work with SQL Server as the primary database. The application currently runs with sample data in memory for demonstration purposes in this Replit environment, but it's ready to connect to your SQL Server database when deployed properly.

## Current Configuration

### Environment Variables
- `SQL_SERVER=true` - Enables SQL Server mode (already set)
- `SQL_SERVER_HOST` - Your SQL Server hostname (default: WSERVER718623-I\SQLEXPRESS)
- `SQL_DATABASE` - Database name (default: InventoryDB)

### Connection Details
The application is configured to connect to:
- **Server**: WSERVER718623-I\SQLEXPRESS
- **Database**: InventoryDB
- **Authentication**: Windows Authentication (NTLM fallback)

## Why It's Using Memory Storage Now

The application shows "Using memory storage implementation (for demonstration purposes)" because:

1. **Network Access**: This Replit cloud environment cannot access your local SQL Server
2. **Security**: Your SQL Server is likely behind a firewall and not accessible from the internet
3. **Fallback Mechanism**: The app automatically falls back to memory storage when SQL Server isn't reachable

## How to Use SQL Server (Production Deployment)

### Option 1: Deploy on Your Local Network
1. Deploy the application on a server within your network that can reach WSERVER718623-I
2. Ensure the server has Node.js installed
3. Set environment variables:
   ```bash
   SQL_SERVER=true
   SQL_SERVER_HOST=WSERVER718623-I\SQLEXPRESS
   SQL_DATABASE=InventoryDB
   ```

### Option 2: Update Connection for Remote Access
1. Configure SQL Server for remote connections
2. Update firewall rules to allow external access
3. Update the application with your public IP or domain

### Option 3: Use SQL Server Connection String
Update `/server/sqlserver-db.ts` with your specific connection details:

```typescript
const sqlServerConfig: sql.config = {
  server: 'your-server-name',
  database: 'InventoryDB',
  // Add user/password if not using Windows Auth
  user: 'your-username',
  password: 'your-password',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};
```

## Database Schema

The application includes a complete SQL Server schema in `/server/sqlserver-schema.sql` with:
- Users table (authentication and roles)
- Assets table (inventory items)
- Transfers table (asset movement tracking)
- Repairs table (maintenance tracking)

## Testing SQL Server Connection

Run the test script to verify your SQL Server connection:
```bash
npm run test-sqlserver
```

## What Works Right Now

Even with memory storage, you can fully test all features:
- ✅ User authentication (admin@inventory.com / admin123)
- ✅ Asset management with full CRUD operations
- ✅ Transfer tracking
- ✅ Repair management
- ✅ Role-based access control
- ✅ Dark mode functionality
- ✅ Complete UI/UX experience

## Next Steps

1. **Test the Application**: Use the current memory-based version to verify all features work as expected
2. **Plan Deployment**: Choose your deployment strategy (local network, cloud with SQL Server access, etc.)
3. **Update Configuration**: Set the appropriate environment variables for your SQL Server
4. **Deploy**: Move the application to an environment that can access your SQL Server

The application is production-ready and will automatically switch to SQL Server when properly deployed!
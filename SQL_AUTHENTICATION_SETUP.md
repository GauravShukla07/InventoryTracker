# SQL Server Authentication Setup Guide

## Overview

The application now supports **both SQL Server Authentication and Windows Authentication**, automatically detecting which method to use based on environment variables.

## Authentication Methods

### SQL Server Authentication (Recommended for Production)

This method uses a SQL Server login with username and password, similar to the Python ODBC connection string you provided.

**Configuration:**
```env
SQL_SERVER=true
SQL_SERVER_HOST=WSERVER718623-I\SQLEXPRESS
SQL_DATABASE=InventoryDB
SQL_USER=your_sql_username
SQL_PASSWORD=your_sql_password
SQL_ENCRYPT=false
SQL_TRUST_CERT=true
```

**Equivalent Python ODBC Connection String:**
```python
conn_str = (
    r"DRIVER={ODBC Driver 17 for SQL Server};"
    r"SERVER=WSERVER718623-I\SQLEXPRESS;"
    r"DATABASE=InventoryDB;"
    r"UID=your_sql_username;"
    r"PWD=your_sql_password;"
    r"Encrypt=no;"
    r"TrustServerCertificate=yes;"
)
```

### Windows Authentication (Fallback)

Used when SQL_USER and SQL_PASSWORD are not provided.

**Configuration:**
```env
SQL_SERVER=true
SQL_SERVER_HOST=WSERVER718623-I\SQLEXPRESS
SQL_DATABASE=InventoryDB
# Leave SQL_USER and SQL_PASSWORD empty for Windows Auth
```

## SQL Server Setup Requirements

### 1. Enable SQL Server Authentication

1. **Open SQL Server Management Studio (SSMS)**
2. **Connect to your SQL Server instance**
3. **Right-click server name → Properties → Security**
4. **Select "SQL Server and Windows Authentication mode"**
5. **Click OK and restart SQL Server service**

### 2. Create SQL Server Login

```sql
-- Create a new SQL Server login
CREATE LOGIN inventory_user WITH PASSWORD = 'SecurePassword123!';

-- Switch to InventoryDB database
USE InventoryDB;

-- Create database user for the login
CREATE USER inventory_user FOR LOGIN inventory_user;

-- Grant necessary permissions
ALTER ROLE db_datareader ADD MEMBER inventory_user;
ALTER ROLE db_datawriter ADD MEMBER inventory_user;
ALTER ROLE db_ddladmin ADD MEMBER inventory_user;

-- Or grant broader permissions if needed
-- ALTER ROLE db_owner ADD MEMBER inventory_user;
```

### 3. Network Configuration

Ensure SQL Server is configured to accept connections:

1. **SQL Server Configuration Manager**
   - Enable TCP/IP protocol
   - Set TCP port to 1433
   - Restart SQL Server service

2. **Windows Firewall**
   - Allow SQL Server through firewall
   - Open port 1433 for inbound connections

## Environment Configuration

### Production Setup (.env)
```env
# Primary Configuration
SQL_SERVER=true
SQL_SERVER_HOST=WSERVER718623-I\SQLEXPRESS
SQL_DATABASE=InventoryDB

# SQL Server Authentication (Recommended)
SQL_USER=inventory_user
SQL_PASSWORD=SecurePassword123!

# Connection Options
SQL_ENCRYPT=false
SQL_TRUST_CERT=true
SQL_INSTANCE=SQLEXPRESS
SQL_TIMEOUT=30000

# Session Security
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

### Cloud Deployment Setup
```env
# For Azure SQL Database
SQL_SERVER=true
SQL_SERVER_HOST=yourserver.database.windows.net
SQL_DATABASE=InventoryDB
SQL_USER=your_admin_user
SQL_PASSWORD=your_secure_password
SQL_ENCRYPT=true
SQL_TRUST_CERT=false
```

## Testing Connection

### Command Line Tests

1. **Test both authentication methods:**
   ```bash
   tsx test-sql-auth.ts
   ```

2. **Comprehensive connection test:**
   ```bash
   tsx check-connection.ts
   ```

3. **API endpoint test:**
   ```bash
   curl http://localhost:5000/api/database/status
   ```

### Expected Results

**With SQL Authentication:**
- Shows "SQL Server Authentication" as auth method
- Displays current SQL user
- Tests all database operations

**With Windows Authentication:**
- Shows "Windows Authentication" as auth method
- Uses current Windows user context
- May require domain configuration

## Connection String Comparison

### Node.js (Current Implementation)
```javascript
// SQL Server Authentication
{
  server: 'WSERVER718623-I\\SQLEXPRESS',
  database: 'InventoryDB',
  user: 'inventory_user',
  password: 'SecurePassword123!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  }
}
```

### Python ODBC Equivalent
```python
conn_str = (
    r"DRIVER={ODBC Driver 17 for SQL Server};"
    r"SERVER=WSERVER718623-I\SQLEXPRESS;"
    r"DATABASE=InventoryDB;"
    r"UID=inventory_user;"
    r"PWD=SecurePassword123!;"
    r"Encrypt=no;"
    r"TrustServerCertificate=yes;"
)
```

## Security Best Practices

1. **Use SQL Server Authentication for production**
2. **Create dedicated database user with minimal permissions**
3. **Use strong passwords**
4. **Enable encryption for cloud connections**
5. **Store credentials in environment variables, never in code**
6. **Use secrets management for production deployments**

## Troubleshooting

### Common Issues

1. **"Login failed for user" errors:**
   - Verify SQL Server authentication is enabled
   - Check username and password are correct
   - Ensure user has database access permissions

2. **"ENOTFOUND" errors:**
   - Server name cannot be resolved (DNS issue)
   - Check server name spelling
   - Try using IP address instead

3. **Connection timeout:**
   - Check firewall settings
   - Verify SQL Server is running
   - Test network connectivity

### Connection Status

The application will automatically:
- Detect authentication method based on environment variables
- Show clear error messages for connection failures
- Provide specific recommendations for each error type
- Fall back gracefully when SQL Server is unavailable

## Current Status

✅ **SQL Server Authentication support implemented**  
✅ **Automatic authentication method detection**  
✅ **Comprehensive connection testing tools**  
✅ **Clear error reporting and diagnostics**  
🔧 **Ready for SQL Server credentials configuration**

To use SQL Server Authentication, simply add your SQL Server username and password to the `.env` file, and the application will automatically use SQL Authentication instead of Windows Authentication.
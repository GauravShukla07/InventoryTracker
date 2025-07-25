# SQL Server Connection Timeout Solutions

## Current Issue: Connection Timeout
**Error:** `Failed to connect to 163.227.186.23\SQLEXPRESS in 30000ms`

This indicates the SQL Server is not responding within the timeout period (30-60 seconds), suggesting:

1. **SQL Server not configured for remote connections**
2. **Windows Firewall blocking connections**
3. **SQL Server service not running**
4. **Network connectivity issues**
5. **Instance name issues (SQLEXPRESS vs default)**

## Immediate Solutions to Try

### 1. Test Different Server Formats
In the Connection Test page, try these options in order:

**Option A: Default Instance (No SQLEXPRESS)**
```
Server: 163.227.186.23
Database: USE InventoryDB
```

**Option B: Specific Port (Bypass Instance Name)**
```
Server: 163.227.186.23,1433
Database: USE InventoryDB
```

**Option C: Alternative Ports**
```
Server: 163.227.186.23,1434    # SQL Browser
Server: 163.227.186.23,1435    # Custom port
```

### 2. SQL Server Configuration (On Windows Server)

**Check SQL Server Status:**
1. Open Services.msc
2. Verify "SQL Server (SQLEXPRESS)" is Running
3. Verify "SQL Server Browser" is Running
4. Set both to Automatic startup

**Enable Remote Connections:**
1. Open SQL Server Configuration Manager
2. Go to "SQL Server Network Configuration" > "Protocols for SQLEXPRESS"
3. Enable "TCP/IP" protocol
4. Right-click TCP/IP > Properties
5. Go to "IP Addresses" tab
6. Under "IPAll" section:
   - TCP Dynamic Ports: (leave blank)
   - TCP Port: 1433
7. Restart SQL Server service

### 3. Windows Firewall Configuration

**Add Firewall Rules:**
```cmd
# Allow SQL Server port
netsh advfirewall firewall add rule name="SQL Server" dir=in action=allow protocol=TCP localport=1433

# Allow SQL Browser port
netsh advfirewall firewall add rule name="SQL Browser" dir=in action=allow protocol=UDP localport=1434
```

**Or temporarily disable firewall for testing:**
```cmd
netsh advfirewall set allprofiles state off
```

### 4. SQL Server Authentication Mode

**Enable SQL Server Authentication:**
1. Connect to SQL Server locally with SSMS
2. Right-click server > Properties > Security
3. Select "SQL Server and Windows Authentication mode"
4. Restart SQL Server service

**Create SQL Login Accounts:**
```sql
-- Create john_login_user
CREATE LOGIN john_login_user WITH PASSWORD = 'StrongPassword1!';
USE [USE InventoryDB];
CREATE USER john_login_user FOR LOGIN john_login_user;
GRANT SELECT ON Users TO john_login_user;

-- Create role-based users
CREATE LOGIN admin_user WITH PASSWORD = 'AdminPass123!';
CREATE LOGIN inventory_operator WITH PASSWORD = 'InventoryOp123!';
```

## Network Diagnostic Commands

**On the SQL Server machine (163.227.186.23):**
```cmd
# Check if SQL Server is listening
netstat -an | findstr 1433
netstat -an | findstr 1434

# Check SQL Server error logs
# Located at: C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\Log\ERRORLOG

# Test local connection
sqlcmd -S localhost\SQLEXPRESS -U john_login_user -P StrongPassword1!
```

**From the application server:**
```bash
# Test basic connectivity (if tools available)
ping 163.227.186.23
telnet 163.227.186.23 1433
telnet 163.227.186.23 1434
```

## Quick Configuration Test

**Try these server configurations in the Connection Test:**

1. **Test Default Instance:**
   - Server: `163.227.186.23`
   - Database: `USE InventoryDB`
   - Port: Default (1433)

2. **Test Named Instance with Port:**
   - Server: `163.227.186.23,1433`
   - Database: `USE InventoryDB`

3. **Test SQL Browser Resolution:**
   - Server: `163.227.186.23\SQLEXPRESS`
   - Database: `USE InventoryDB`
   - Ensure SQL Browser service is running

## Alternative Connection Strings

If named instance continues to fail, try:

```javascript
// Option 1: Default instance
{
  server: "163.227.186.23",
  database: "USE InventoryDB",
  port: 1433
}

// Option 2: Specific port
{
  server: "163.227.186.23",
  database: "USE InventoryDB", 
  port: 1435  // Custom port
}

// Option 3: Connection string format
{
  connectionString: "Server=163.227.186.23,1433;Database=USE InventoryDB;User Id=john_login_user;Password=StrongPassword1!;TrustServerCertificate=true;"
}
```

## Expected Success Indicators

**Successful connection should show:**
- ✅ Connection established in <5 seconds
- Server version: 16.0.1000.6 (SQL Server 2022)
- Database accessible: "USE InventoryDB"
- Authentication successful

## Common Error Resolution

| Error | Cause | Solution |
|-------|-------|----------|
| Connection timeout | SQL Server not accepting remote connections | Enable TCP/IP, configure firewall |
| Login failed | Authentication issue | Enable mixed mode, create SQL users |
| Database not found | Database name issue | Verify "USE InventoryDB" exists |
| Port unreachable | Firewall or service issue | Check firewall rules and SQL services |

## Next Steps

1. **Test the new server format options** in the Connection Test page
2. **Check SQL Server configuration** on 163.227.186.23
3. **Verify firewall settings** allow SQL Server ports
4. **Enable remote connections** in SQL Server Configuration Manager
5. **Create required SQL users** with proper permissions

The application now has increased timeout (60s) and multiple connection alternatives to help identify the exact configuration issue.
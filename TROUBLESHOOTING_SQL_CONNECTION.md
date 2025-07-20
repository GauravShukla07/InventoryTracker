# SQL Server Connection Troubleshooting Guide

This guide helps troubleshoot common SQL Server connection issues encountered in the inventory management system.

## Current Issue: DNS Resolution Failed

**Error:** `getaddrinfo ENOTFOUND wserver718623-i`

**Root Cause:** The server name `WSERVER718623-I\SQLEXPRESS` cannot be resolved by DNS. This typically happens because:
1. The server name doesn't exist in DNS
2. Network connectivity issues
3. Server is offline or unreachable
4. DNS configuration problems

## Troubleshooting Steps

### 1. Basic Network Tests

Test if the server is reachable:
```bash
# Test DNS resolution
nslookup WSERVER718623-I
ping WSERVER718623-I

# If DNS fails, try with IP address instead
ping 192.168.1.100  # Replace with actual IP
```

### 2. SQL Server Specific Tests

Check SQL Server connectivity:
```bash
# Test SQL Server port (1433 for default, 1434 for SQL Browser)
telnet WSERVER718623-I 1433
telnet WSERVER718623-I 1434

# Test with IP address if server name fails
telnet 192.168.1.100 1433
```

### 3. Connection String Alternatives

Try these connection approaches in order:

**Option 1: Use IP Address**
```
Server: 192.168.1.100\SQLEXPRESS
Database: InventoryDB
```

**Option 2: Use Fully Qualified Domain Name**
```
Server: WSERVER718623-I.domain.local\SQLEXPRESS
Database: InventoryDB
```

**Option 3: Use Port Number Instead of Instance**
```
Server: WSERVER718623-I,1435  # Replace 1435 with actual port
Database: InventoryDB
```

**Option 4: Use Default Instance (if available)**
```
Server: WSERVER718623-I
Database: InventoryDB
```

### 4. SQL Server Configuration Check

Verify SQL Server is properly configured:

1. **SQL Server Configuration Manager:**
   - Enable TCP/IP protocol
   - Set specific port (recommended over dynamic ports)
   - Restart SQL Server service

2. **SQL Server Browser Service:**
   - Must be running for named instances
   - Uses UDP port 1434
   - Alternative: Use specific port instead

3. **Windows Firewall:**
   - Allow SQL Server port (default 1433)
   - Allow SQL Browser port (UDP 1434)
   - Consider temporarily disabling firewall for testing

### 5. Authentication Issues

Common authentication problems:

**SQL Server Authentication:**
- Enable mixed mode authentication
- Create SQL login accounts
- Grant proper database permissions

**Windows Authentication:**
- Ensure proper domain trust
- Use service account if needed
- Check security event logs

### 6. Database-Specific Issues

**Database Access:**
- Verify database exists
- Check user has db_datareader/db_datawriter permissions
- Ensure database is online

## Quick Fixes for Current Setup

### Immediate Solutions:

1. **Get Server IP Address:**
   - Log into WSERVER718623-I
   - Run `ipconfig` to get IP address
   - Use IP instead of server name

2. **Check SQL Server Status:**
   - Services.msc → SQL Server (SQLEXPRESS) should be running
   - Services.msc → SQL Server Browser should be running

3. **Test Connection Tools:**
   - SQL Server Management Studio
   - sqlcmd command line tool
   - Connection Test utility in the application

### Connection Test Examples:

```javascript
// Test with IP address
{
  server: "192.168.1.100\\SQLEXPRESS",
  database: "InventoryDB",
  uid: "john_login_user",
  pwd: "StrongPassword1!"
}

// Test with port number
{
  server: "192.168.1.100,1435",
  database: "InventoryDB", 
  uid: "john_login_user",
  pwd: "StrongPassword1!"
}
```

## Environment Variables Fix

Update `.env` file:
```env
# Instead of server name, use IP address
SQL_SERVER_HOST=192.168.1.100\\SQLEXPRESS

# Or use specific port
SQL_SERVER_HOST=192.168.1.100,1435
```

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `getaddrinfo ENOTFOUND` | DNS resolution failed | Use IP address |
| `Login failed` | Authentication error | Check username/password |
| `Cannot open database` | Database access denied | Check permissions |
| `Connection timeout` | Network/firewall issue | Check network connectivity |
| `ECONNREFUSED` | SQL Server not accepting connections | Check if SQL Server is running |

## Next Steps

1. **Identify Server IP:** Find the actual IP address of WSERVER718623-I
2. **Test Basic Connectivity:** Ping and telnet tests
3. **Update Configuration:** Use IP address instead of server name
4. **Test Authentication:** Verify SQL logins work
5. **Configure Firewall:** Ensure proper ports are open

## Support Resources

- SQL Server Configuration Manager
- SQL Server Error Logs
- Windows Event Viewer
- Network connectivity tools (ping, telnet, nslookup)
- SQL Server Management Studio connection tests
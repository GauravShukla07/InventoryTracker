# SQL Server Connection Solutions

## Current Problem
The connection to `WSERVER718623-I\SQLEXPRESS` is failing with DNS resolution error. The server name cannot be found on the network.

## Immediate Solutions to Try

### 1. Find the Actual Server IP Address
**Best Solution:** Replace server name with IP address
- Log into the Windows server WSERVER718623-I
- Open Command Prompt as Administrator
- Run: `ipconfig /all`
- Find the IPv4 address (e.g., 192.168.1.100)
- Use: `192.168.1.100\SQLEXPRESS` in connection string

### 2. Test Local Connection First
If SQL Server is on the same machine:
```
Server: localhost\SQLEXPRESS
or
Server: .\SQLEXPRESS
or  
Server: (local)\SQLEXPRESS
```

### 3. Use Port Number Instead of Instance Name
Find the SQL Server port and use:
```
Server: WSERVER718623-I,1433    (default port)
or
Server: 192.168.1.100,1433      (with IP + port)
```

### 4. Check SQL Server Configuration
**On the SQL Server machine:**
1. Open SQL Server Configuration Manager
2. Go to SQL Server Network Configuration > Protocols for SQLEXPRESS
3. Enable TCP/IP protocol
4. Right-click TCP/IP > Properties > IP Addresses tab
5. Note the port number under IPAll section
6. Restart SQL Server service

### 5. Verify SQL Browser Service
For named instances like SQLEXPRESS:
1. Open Services.msc on SQL Server machine
2. Find "SQL Server Browser" service
3. Set to Automatic and Start it
4. This enables instance name resolution

## Quick Test Steps

1. **Connection Test Page:** Go to `/connection-test` in the application
2. **Try these server formats in order:**
   - `localhost\SQLEXPRESS` (if local)
   - `192.168.1.100\SQLEXPRESS` (replace with actual IP)
   - `WSERVER718623-I,1433` (with port number)
   - `WSERVER718623-I.yourdomain.com\SQLEXPRESS` (with domain)

3. **Use these credentials:**
   - Username: `john_login_user`
   - Password: `StrongPassword1!`

## Network Troubleshooting Commands

**On the application server (where this app runs):**
```bash
# Test basic connectivity
ping WSERVER718623-I
ping 192.168.1.100

# Test SQL Server ports
telnet WSERVER718623-I 1433    # Default SQL port
telnet WSERVER718623-I 1434    # SQL Browser port
```

**On Windows (if available):**
```cmd
# Test name resolution
nslookup WSERVER718623-I
ping WSERVER718623-I

# Check SQL Server ports
telnet WSERVER718623-I 1433
netstat -an | findstr 1433
```

## Environment Variable Updates

Once you find the working server address, update `.env`:
```env
# Replace with working server address
SQL_SERVER_HOST=192.168.1.100\SQLEXPRESS

# Or with port number
SQL_SERVER_HOST=192.168.1.100,1433
```

## Expected Results

**Successful Connection Should Show:**
- ✅ Connection successful in XXms
- Server version information
- Database access confirmation
- User permissions verification

**Common Success Indicators:**
- No DNS resolution errors
- Authentication successful
- Database "InventoryDB" accessible
- User has proper permissions

## If Still Failing

1. **Check Windows Firewall** on SQL Server machine
2. **Verify SQL Server is running** (Services.msc)
3. **Check SQL Server error logs** for authentication issues
4. **Test with SQL Server Management Studio** from same network
5. **Contact network administrator** for server connectivity

## Alternative: Use Different Database

If SQL Server connection cannot be established, the application can fall back to:
- PostgreSQL (already configured in the app)
- Local development database
- Cloud database service

The application is designed to work with both SQL Server and PostgreSQL backends.
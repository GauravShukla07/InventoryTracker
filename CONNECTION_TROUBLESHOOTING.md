# SQL Server Connection Troubleshooting Guide

## Current Connection Issue Analysis

### Problem Identified
**Primary Issue**: `ENOTFOUND wserver718623-i` - DNS resolution failure

The application cannot resolve the hostname `WSERVER718623-I\SQLEXPRESS` from the current cloud environment.

### Root Cause
The SQL Server `WSERVER718623-I\SQLEXPRESS` is on a private network that is not accessible from this Replit cloud environment.

## Connection Test Results

✅ **Environment Configuration**: Correctly set to SQL Server mode  
❌ **DNS Resolution**: Cannot resolve server hostname  
❌ **Network Connectivity**: Cannot ping or connect to server  
❌ **SQL Server Port**: Port 1433 not accessible  

## Solutions by Deployment Scenario

### 1. Cloud-to-On-Premises Connection

**For connecting from cloud to your on-premises SQL Server:**

```bash
# Option A: Use IP address instead of hostname
SQL_SERVER_HOST=192.168.x.x\SQLEXPRESS  # Replace with actual IP

# Option B: Use fully qualified domain name
SQL_SERVER_HOST=wserver718623-i.yourdomain.local\SQLEXPRESS

# Option C: Configure VPN tunnel
# Set up site-to-site VPN or Azure ExpressRoute
```

### 2. Same Network Deployment

**For deploying on the same network as SQL Server:**

1. Deploy application on Windows server in same domain
2. Configure firewall rules for SQL Server access
3. Enable SQL Server network protocols
4. Use Windows Authentication or SQL Server Authentication

### 3. Cloud Database Migration

**For full cloud deployment:**

```bash
# Option A: Azure SQL Database
SQL_SERVER_HOST=yourserver.database.windows.net
SQL_DATABASE=InventoryDB
SQL_USER=yourusername
SQL_PASSWORD=yourpassword

# Option B: AWS RDS SQL Server
SQL_SERVER_HOST=yourinstance.region.rds.amazonaws.com
```

## Connection Configuration Examples

### Windows Authentication (On-premises)
```env
SQL_SERVER=true
SQL_SERVER_HOST=WSERVER718623-I\SQLEXPRESS
SQL_DATABASE=InventoryDB
# No username/password for Windows Auth
```

### SQL Server Authentication
```env
SQL_SERVER=true
SQL_SERVER_HOST=WSERVER718623-I\SQLEXPRESS
SQL_DATABASE=InventoryDB
SQL_USER=your_sql_user
SQL_PASSWORD=your_sql_password
```

### Cloud SQL Server
```env
SQL_SERVER=true
SQL_SERVER_HOST=yourserver.database.windows.net
SQL_DATABASE=InventoryDB
SQL_USER=your_admin_user
SQL_PASSWORD=your_secure_password
```

## SQL Server Configuration Requirements

### Enable SQL Server Network Access

1. **SQL Server Configuration Manager**:
   - Enable TCP/IP protocol
   - Set TCP port to 1433
   - Restart SQL Server service

2. **SQL Server Management Studio**:
   - Enable mixed authentication mode
   - Create SQL Server login if using SQL Auth
   - Grant database access permissions

3. **Windows Firewall**:
   - Allow SQL Server through firewall
   - Open port 1433 for inbound connections

### Network Requirements

- **DNS Resolution**: Server hostname must be resolvable
- **Firewall Rules**: Port 1433 must be accessible
- **Authentication**: Windows Auth or SQL Server Auth configured
- **SSL/TLS**: Configure encryption settings as needed

## Testing Connection

### Command Line Tests
```bash
# Test basic connectivity
tsx debug-connection.ts

# Quick connection check
tsx check-connection.ts

# API endpoint test
curl http://localhost:5000/api/database/status
```

### Network Diagnostics
```bash
# Test hostname resolution
nslookup WSERVER718623-I

# Test port connectivity
telnet WSERVER718623-I 1433

# Test with IP address
ping 192.168.x.x
```

## Deployment Recommendations

### Option 1: On-Premises Deployment (Recommended)
Deploy the application on a Windows server within the same network as the SQL Server.

**Advantages**:
- Direct network access to SQL Server
- Can use Windows Authentication
- No additional network configuration needed
- Best performance and security

### Option 2: Hybrid Cloud with VPN
Use cloud hosting with VPN connection to on-premises SQL Server.

**Requirements**:
- Site-to-site VPN or Azure ExpressRoute
- Proper DNS configuration
- Firewall rules for SQL Server access

### Option 3: Cloud Database Migration
Migrate SQL Server to cloud (Azure SQL Database, AWS RDS).

**Benefits**:
- Full cloud deployment
- Managed database service
- Automatic backups and updates
- Global accessibility

## Current Status Summary

🔴 **Status**: Connection Failed  
🔍 **Error**: DNS resolution failure (ENOTFOUND)  
📍 **Server**: WSERVER718623-I\SQLEXPRESS  
🌐 **Environment**: Cloud (Replit) to On-premises SQL Server  

**Next Steps**:
1. Choose deployment strategy (see recommendations above)
2. Configure network connectivity or migrate to cloud database
3. Update connection configuration accordingly
4. Test connection using provided tools

The application is correctly configured for SQL Server and will work perfectly once network connectivity is established.
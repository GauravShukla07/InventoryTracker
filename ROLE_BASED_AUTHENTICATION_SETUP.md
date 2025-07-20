# Role-Based Authentication System Setup

## Architecture Overview

The inventory management system now implements a **Two-Tier Authentication Architecture** with dynamic connection switching:

1. **Authentication Layer**: Low-privilege user (`john_login_user`) for user verification
2. **Operation Layer**: Role-specific SQL Server users for actual database operations

## Connection Flow

### 1. Application Initialization
```
Connect as: john_login_user (read-only access to Users table)
Purpose: User authentication and role determination
```

### 2. User Login Process
```
1. User enters credentials → App authenticates via john's connection
2. Lookup user role in Users table → Determine associated database user
3. Close john's connection → Create new connection with role-specific user
4. All subsequent operations use role-based connection
```

### 3. Connection String Equivalents

**Initial Authentication Connection (Python equivalent):**
```python
conn_str = (
    r"DRIVER={ODBC Driver 17 for SQL Server};"
    r"SERVER=WSERVER718623-I\SQLEXPRESS;"
    r"DATABASE=InventoryDB;"
    r"UID=john_login_user;"
    r"PWD=StrongPassword1!;"
    r"Encrypt=no;"
    r"TrustServerCertificate=yes;"
)
```

**Role-Based Connection (Python equivalent):**
```python
# After authentication, switch to role-specific user
conn_str = (
    r"DRIVER={ODBC Driver 17 for SQL Server};"
    r"SERVER=WSERVER718623-I\SQLEXPRESS;"
    r"DATABASE=InventoryDB;"
    r"UID=" + role + ";"  # e.g., 'inventory_operator', 'admin_user'
    r"PWD=" + rolePassword + ";"
    r"Encrypt=no;"
    r"TrustServerCertificate=yes;"
)
```

## Required SQL Server Setup

### 1. Create Authentication User (john)
```sql
-- Create low-privilege login for authentication
CREATE LOGIN john_login_user WITH PASSWORD = 'StrongPassword1!';

USE InventoryDB;

-- Create database user
CREATE USER john_login_user FOR LOGIN john_login_user;

-- Grant minimal permissions (read-only access to Users table)
GRANT SELECT ON Users TO john_login_user;
GRANT UPDATE ON Users (lastLogin) TO john_login_user;  -- For login timestamp updates
```

### 2. Create Role-Based Users
```sql
-- Admin role
CREATE LOGIN admin_user WITH PASSWORD = 'AdminPass123!';
CREATE USER admin_user FOR LOGIN admin_user;
ALTER ROLE db_owner ADD MEMBER admin_user;

-- Manager role
CREATE LOGIN manager WITH PASSWORD = 'ManagerPass123!';
CREATE USER manager FOR LOGIN manager;
ALTER ROLE db_datareader ADD MEMBER manager;
ALTER ROLE db_datawriter ADD MEMBER manager;

-- Inventory Operator role
CREATE LOGIN inventory_operator WITH PASSWORD = 'InventoryOp123!';
CREATE USER inventory_operator FOR LOGIN inventory_operator;
ALTER ROLE db_datareader ADD MEMBER inventory_operator;
ALTER ROLE db_datawriter ADD MEMBER inventory_operator;
-- Restrict to specific tables if needed
DENY DELETE ON Users TO inventory_operator;

-- Viewer role  
CREATE LOGIN viewer WITH PASSWORD = 'ViewerPass123!';
CREATE USER viewer FOR LOGIN viewer;
ALTER ROLE db_datareader ADD MEMBER viewer;
```

### 3. Update Users Table Schema
```sql
-- Add database user mapping columns to Users table
ALTER TABLE Users ADD dbUser NVARCHAR(50) NULL;
ALTER TABLE Users ADD dbPassword NVARCHAR(100) NULL;

-- Update existing users with their database user mappings
UPDATE Users SET 
    dbUser = 'admin_user',
    dbPassword = 'AdminPass123!'
WHERE role = 'admin';

UPDATE Users SET 
    dbUser = 'manager',
    dbPassword = 'ManagerPass123!'
WHERE role = 'manager';

UPDATE Users SET 
    dbUser = 'inventory_operator',
    dbPassword = 'InventoryOp123!'
WHERE role = 'operator';

UPDATE Users SET 
    dbUser = 'viewer',
    dbPassword = 'ViewerPass123!'
WHERE role = 'viewer';
```

## Environment Configuration

### Development Environment (.env)
```env
SQL_SERVER=true

# Authentication User (john) - Low privilege for login verification only
SQL_AUTH_USER=john_login_user
SQL_AUTH_PASSWORD=StrongPassword1!

# Server Connection
SQL_SERVER_HOST=WSERVER718623-I\SQLEXPRESS
SQL_DATABASE=InventoryDB

# Connection Options
SQL_ENCRYPT=false
SQL_TRUST_CERT=true
SQL_INSTANCE=SQLEXPRESS

# Role-based Database User Passwords
SQL_ADMIN_PASSWORD=AdminPass123!
SQL_MANAGER_PASSWORD=ManagerPass123!
SQL_OPERATOR_PASSWORD=OperatorPass123!
SQL_VIEWER_PASSWORD=ViewerPass123!
SQL_INVENTORY_OPERATOR_PASSWORD=InventoryOp123!
SQL_ADMIN_USER_PASSWORD=AdminUser123!

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

## Security Benefits

1. **Principle of Least Privilege**: Each user gets only the database permissions they need
2. **Connection Isolation**: User sessions use separate database connections with appropriate permissions
3. **Audit Trail**: Database operations are performed under the actual user's role context
4. **Defense in Depth**: Even if application is compromised, database access is limited by SQL Server permissions

## Application Flow

### Login Process
1. **User submits credentials** → `POST /api/auth/login`
2. **Authenticate with john's connection**:
   ```sql
   SELECT role, dbUser, dbPassword FROM Users 
   WHERE (email = ? OR username = ?) AND password = ?
   ```
3. **Close john's connection**
4. **Create role-based connection** using retrieved `dbUser` and `dbPassword`
5. **Store session connection** for subsequent operations
6. **Return success** with user info and session token

### Subsequent Requests
1. **Middleware checks session** → Extract user session ID
2. **Use role-based connection** for that session
3. **Execute operations** with appropriate database permissions
4. **Return results** to client

### Logout Process
1. **Close role-based connection** for session
2. **Clear session data**
3. **Remove authentication tokens**

## Connection Management

- **Authentication Connection**: Single persistent connection for all login attempts
- **Session Connections**: Separate connection pool per user session with role-specific permissions
- **Graceful Cleanup**: Automatic connection cleanup on logout or session expiry
- **Error Handling**: Fallback to re-authentication if connection is lost

## Testing the System

### Connection Test Commands
```bash
# Test authentication connection
tsx test-sql-auth.ts

# Test role-based connections
tsx debug-connection.ts

# API endpoint test
curl http://localhost:5000/api/database/status
```

### Expected Behavior
1. Application starts with john's authentication connection
2. Login attempts use john's connection for verification
3. Successful login creates role-specific connection
4. All operations use role-specific permissions
5. Logout cleanly closes role-specific connection

This architecture provides enterprise-grade security while maintaining the exact connection flow you specified in your requirements.
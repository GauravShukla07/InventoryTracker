# Complete Deployment Guide for Inventory Management System

## Prerequisites

### System Requirements
- Node.js 18.x or 20.x
- SQL Server (Windows Server recommended)
- Minimum 2GB RAM
- 10GB disk space

### Required Access
- SQL Server with administrative privileges
- Network access to SQL Server (port 2499 in this case)
- Environment for hosting Node.js applications

## Pre-Deployment SQL Server Setup

### 1. Create Authentication User
```sql
-- Create low-privilege login for authentication
CREATE LOGIN john_login_user WITH PASSWORD = 'StrongPassword1!';

USE InventoryDB;

-- Create database user
CREATE USER john_login_user FOR LOGIN john_login_user;

-- Grant minimal permissions (read-only access to Users table)
GRANT SELECT ON Users TO john_login_user;
```

### 2. Create Role-Based Users
```sql
-- Create role-specific logins
CREATE LOGIN admin_user WITH PASSWORD = 'AdminPass123!';
CREATE LOGIN manager_user WITH PASSWORD = 'ManagerPass123!';
CREATE LOGIN inventory_operator WITH PASSWORD = 'InventoryOp123!';
CREATE LOGIN viewer_user WITH PASSWORD = 'ViewerPass123!';

USE InventoryDB;

-- Create database users
CREATE USER admin_user FOR LOGIN admin_user;
CREATE USER manager_user FOR LOGIN manager_user;
CREATE USER inventory_operator FOR LOGIN inventory_operator;
CREATE USER viewer_user FOR LOGIN viewer_user;

-- Grant permissions based on roles
-- Admin: Full access
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO admin_user;

-- Manager: Read/Write access to most tables
GRANT SELECT, INSERT, UPDATE ON Assets TO manager_user;
GRANT SELECT, INSERT, UPDATE ON Transfers TO manager_user;
GRANT SELECT, INSERT, UPDATE ON Repairs TO manager_user;
GRANT SELECT ON Users TO manager_user;

-- Operator: Limited write access
GRANT SELECT, INSERT, UPDATE ON Assets TO inventory_operator;
GRANT SELECT, INSERT ON Transfers TO inventory_operator;
GRANT SELECT, INSERT ON Repairs TO inventory_operator;

-- Viewer: Read-only access
GRANT SELECT ON Assets TO viewer_user;
GRANT SELECT ON Transfers TO viewer_user;
GRANT SELECT ON Repairs TO viewer_user;
```

### 3. Create Users Table and Sample Data
```sql
-- Create users table if it doesn't exist
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  username NVARCHAR(255) NOT NULL UNIQUE,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  role NVARCHAR(50) NOT NULL DEFAULT 'viewer',
  role_password NVARCHAR(255),
  department NVARCHAR(255),
  is_active BIT NOT NULL DEFAULT 1
);

-- Insert sample users
INSERT INTO users (username, email, password, role, role_password, is_active) VALUES
('admin', 'admin@inventory.com', 'password123', 'admin_user', 'AdminPass123!', 1),
('manager', 'manager@inventory.com', 'manager123', 'manager_user', 'ManagerPass123!', 1),
('operator', 'operator@inventory.com', 'operator123', 'inventory_operator', 'InventoryOp123!', 1),
('viewer', 'viewer@inventory.com', 'viewer123', 'viewer_user', 'ViewerPass123!', 1);
```

## Environment Configuration

### 1. Create .env File
```bash
# Database Configuration
SQL_SERVER=true
SQL_AUTH_USER=john_login_user
SQL_AUTH_PASSWORD=StrongPassword1!

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
NODE_ENV=production

# Optional: Port Configuration
PORT=5000
```

### 2. Environment Variables Explained
- `SQL_SERVER=true`: Enables SQL Server mode instead of PostgreSQL
- `SQL_AUTH_USER`: Low-privilege user for authentication
- `SQL_AUTH_PASSWORD`: Password for authentication user
- `SESSION_SECRET`: Secret key for session encryption (CHANGE THIS!)
- `NODE_ENV`: Set to 'production' for deployment
- `PORT`: Application port (default: 5000)

## Deployment Options

### Option 1: Direct Server Deployment

#### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

#### 2. Application Deployment
```bash
# Clone or copy application files
git clone <your-repository> inventory-app
cd inventory-app

# Install dependencies
npm install

# Build the application
npm run build

# Create .env file with your configuration
nano .env

# Test the application
npm start

# Deploy with PM2
pm2 start npm --name "inventory-app" -- start
pm2 save
pm2 startup
```

#### 3. Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'
services:
  inventory-app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - SQL_SERVER=true
      - SQL_AUTH_USER=john_login_user
      - SQL_AUTH_PASSWORD=StrongPassword1!
      - SESSION_SECRET=your-super-secret-session-key
    restart: unless-stopped
```

#### 3. Deploy with Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Update deployment
docker-compose pull && docker-compose up -d
```

### Option 3: Cloud Platform Deployment

#### Heroku Deployment
```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-inventory-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SQL_SERVER=true
heroku config:set SQL_AUTH_USER=john_login_user
heroku config:set SQL_AUTH_PASSWORD=StrongPassword1!
heroku config:set SESSION_SECRET=your-super-secret-session-key

# Deploy
git push heroku main
```

#### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on git push

#### DigitalOcean App Platform
1. Create new app from GitHub repository
2. Configure environment variables
3. Set build command: `npm run build`
4. Set run command: `npm start`

## Database Connection Configuration

### Network Configuration
- Ensure SQL Server is accessible from deployment environment
- Configure firewall rules for port 2499 (or your SQL Server port)
- Verify network connectivity between application and database

### Connection String Format
The application uses these connection parameters:
```javascript
{
  server: '163.227.186.23',     // Your SQL Server IP
  database: 'USE InventoryDB',  // Your database name
  port: 2499,                   // Your SQL Server port
  user: 'dynamic',              // Changes based on authentication
  password: 'dynamic',          // Changes based on role
}
```

## Security Considerations

### 1. Environment Variables
- Never commit .env files to version control
- Use secure secret management in production
- Rotate passwords regularly

### 2. Network Security
- Use VPN or private networks when possible
- Configure SQL Server for specific IP access only
- Enable SQL Server logging and monitoring

### 3. Application Security
- Keep dependencies updated
- Use HTTPS in production
- Implement rate limiting if needed

## Monitoring and Maintenance

### 1. Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs inventory-app

# Restart application
pm2 restart inventory-app
```

### 2. Database Monitoring
- Monitor connection pool usage
- Check SQL Server performance
- Regular backup procedures

### 3. Health Checks
The application provides health check endpoints:
- `GET /api/health` - Application health
- `GET /api/database/test-connection` - Database connectivity

## Troubleshooting

### Common Issues

#### Connection Timeout
```bash
# Check network connectivity
telnet 163.227.186.23 2499

# Verify SQL Server is running
# Check firewall settings
```

#### Authentication Failures
```bash
# Verify user exists in SQL Server
# Check password in .env file
# Ensure john_login_user has correct permissions
```

#### Application Crashes
```bash
# Check PM2 logs
pm2 logs

# Check disk space
df -h

# Check memory usage
free -m
```

### Log Analysis
- Application logs: PM2 logs or container logs
- SQL Server logs: SQL Server error logs
- Network logs: System network logs

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Session store (Redis, SQL Server)
- Multiple application instances

### Database Scaling
- Read replicas for reporting
- Connection pooling optimization
- Query optimization

This guide provides comprehensive deployment instructions for various environments. Choose the option that best fits your infrastructure and requirements.
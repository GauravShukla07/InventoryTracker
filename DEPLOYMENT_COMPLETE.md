# Inventory Tracker - Local Development Deployment Guide

## 🖥️ Local Development Server

### Prerequisites
- ✅ Node.js v18+ (you have v22.17.1)
- ✅ SQL Server with InventoryDB database
- ✅ Git (for version control)

### Quick Start
```bash
# 1. Clone and setup
git clone <your-repo>
cd InventoryTracker

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Setup environment
cp .env.example .env
# Edit .env with your SQL Server credentials

# 4. Setup database
# Run database-setup.sql in SQL Server Management Studio

# 5. Start development
npm run dev
# Opens on http://localhost:5000
```

### Development URLs
- 🌐 Frontend: http://localhost:5000
- 🔌 API: http://localhost:5000/api
- 🏥 Health Check: http://localhost:5000/health

### File Structure for Development
```
📁 InventoryTracker/
├── 📁 client/src/          # React frontend
│   ├── 📁 components/      # UI components
│   ├── 📁 pages/          # Page components
│   └── 📁 lib/            # Utilities
├── 📁 server/             # Express backend
│   ├── index.ts           # Main server
│   ├── routes.ts          # API routes
│   └── sqlserver-*.ts     # Database layer
├── 📁 shared/             # Shared types/schema
├── .env                   # Environment variables
└── package.json           # Dependencies
```

## 🚀 Production Deployment Options

### Option 1: VPS/Dedicated Server

#### Step 1: Server Setup
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm nginx pm2

# CentOS/RHEL
sudo yum install nodejs npm nginx
sudo npm install -g pm2
```

#### Step 2: Application Deployment
```bash
# 1. Clone repository
git clone <your-repo>
cd InventoryTracker

# 2. Install dependencies
npm install --production --legacy-peer-deps

# 3. Build application
npm run build

# 4. Setup environment
cp .env.example .env
# Configure production environment variables

# 5. Start with PM2
pm2 start dist/index.js --name "inventory-tracker"
pm2 save
pm2 startup
```

#### Step 3: Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

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

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  inventory-app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - SQL_SERVER_HOST=your-sql-server
      - SQL_DATABASE=InventoryDB
      - SQL_USER=your_user
      - SQL_PASSWORD=your_password
    restart: unless-stopped
```

### Option 3: Cloud Deployment (Azure/AWS)

#### Azure App Service
1. Create App Service (Node.js 18+)
2. Configure Application Settings (environment variables)
3. Deploy via GitHub Actions or Azure CLI
4. Configure Azure SQL Database connection

#### AWS Elastic Beanstalk
1. Create Node.js application
2. Upload deployment package
3. Configure environment variables
4. Setup RDS SQL Server instance

## 🔒 Production Security Checklist

- [ ] Change SESSION_SECRET to a strong random value
- [ ] Use SQL Server Authentication with strong passwords
- [ ] Enable SSL/TLS (set SQL_ENCRYPT=true)
- [ ] Configure firewall rules for SQL Server
- [ ] Use environment variables for all sensitive data
- [ ] Enable HTTPS with SSL certificate
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database
- [ ] Implement rate limiting for API endpoints
- [ ] Use a reverse proxy (Nginx/Apache)

## 🔧 Environment Variables for Production

```bash
# Production Environment (.env)
NODE_ENV=production
PORT=5000

# SQL Server (Production)
SQL_SERVER=true
SQL_SERVER_HOST=your-production-server
SQL_DATABASE=InventoryDB
SQL_USER=production_user
SQL_PASSWORD=strong_production_password
SQL_ENCRYPT=true
SQL_TRUST_CERT=false

# Security
SESSION_SECRET=super-strong-random-session-secret-key-64-chars-minimum

# Logging
LOG_LEVEL=info
```

## 📊 Monitoring & Maintenance

### Health Checks
- GET /health - Application health
- GET /api/health - Database connectivity
- Monitor CPU, Memory, Disk usage
- Set up alerts for downtime

### Database Maintenance
- Regular backups (daily recommended)
- Monitor connection pool usage
- Log slow queries
- Regular security updates

### Application Updates
```bash
# Zero-downtime deployment with PM2
git pull origin main
npm install --production
npm run build
pm2 reload inventory-tracker
```

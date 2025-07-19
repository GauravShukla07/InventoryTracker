# Deployment Guide

## Dependencies Overview

This Node.js application uses `package.json` to manage dependencies. All required packages are automatically installed during deployment.

### Production Dependencies

#### Core Backend
- `express` - Web framework
- `@neondatabase/serverless` - PostgreSQL database adapter
- `drizzle-orm` - TypeScript ORM
- `express-session` - Session management
- `connect-pg-simple` - PostgreSQL session store
- `zod` - Runtime type validation

#### Frontend Core
- `react` - Frontend framework
- `react-dom` - React DOM renderer
- `wouter` - Client-side routing
- `@tanstack/react-query` - Server state management
- `react-hook-form` - Form handling

#### UI Framework
- `@radix-ui/react-*` - Component primitives
- `tailwindcss` - CSS framework
- `lucide-react` - Icon library

### Development Dependencies
- `typescript` - TypeScript compiler
- `vite` - Build tool
- `tsx` - TypeScript execution
- `drizzle-kit` - Database migration tools

## Environment Variables

Set these in your hosting platform:

```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-secure-random-string-here
PORT=5000
```

## Deployment Commands

```bash
# Install dependencies
npm install

# Build production assets
npm run build

# Set up database schema
npm run db:push

# Start production server
npm start
```

## Platform-Specific Setup

### Heroku
1. Create a Heroku app
2. Add PostgreSQL addon: `heroku addons:create heroku-postgresql:mini`
3. Set environment variables in Heroku dashboard
4. Deploy via Git or GitHub integration

### Render
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add PostgreSQL database service
5. Set environment variables in Render dashboard

### Railway
1. Connect GitHub repository
2. Add PostgreSQL service
3. Set environment variables
4. Deploy automatically on push

## Database Setup

The application uses PostgreSQL with Drizzle ORM. The database schema is automatically created when you run `npm run db:push`.

### Required Tables
- `users` - User accounts and authentication
- `assets` - Asset tracking
- `transfers` - Asset transfer history
- `repairs` - Repair tracking

## Build Process

1. TypeScript compilation
2. Vite builds React frontend to `dist/public`
3. Express serves both API and static files in production

## Health Check

The application exposes the following endpoints for monitoring:
- `GET /` - Serves the React application
- `GET /api/auth/registration-status` - API health check
- `GET /api/assets` - Protected endpoint (requires authentication)

## System Requirements

- Node.js >= 18.0.0
- PostgreSQL database
- Minimum 512MB RAM
- SSL support for production

## Security Considerations

- All API endpoints use CORS protection
- Session-based authentication with secure cookies
- Environment variables for sensitive configuration
- Input validation with Zod schemas
- SQL injection protection via Drizzle ORM

## Monitoring

Log levels and monitoring endpoints:
- Application logs via console
- Express request logging
- Database connection status
- Session store health
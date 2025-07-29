# Asset Management System

## Overview

This is a full-stack asset management system built with React (frontend) and Express.js (backend). The application allows users to track, transfer, and manage organizational assets with features for role-based access control, repair tracking, and comprehensive reporting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern React features
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Build Tool**: Vite with TypeScript support for fast development and optimized builds

### Backend Architecture
- **Framework**: Express.js with TypeScript for type-safe server development
- **Database**: PostgreSQL with Drizzle ORM and Neon serverless adapter for scalable data management
- **Session Management**: Express sessions with PostgreSQL store for persistent authentication
- **API Design**: RESTful API with JSON responses and proper HTTP status codes
- **Authentication**: Session-based authentication with token fallback for multi-device support
- **Development**: Hot reload with Vite integration for seamless development experience

### Database Design
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization
- **Connection**: Neon serverless adapter for scalable PostgreSQL connections
- **Alternative Support**: SQL Server integration available (configured but not primary)

## Key Components

### Database Schema
- **Users**: Role-based user management (admin, manager, operator, viewer) with authentication data
- **Assets**: Core asset tracking with comprehensive metadata including voucher numbers, locations, donors, and status
- **Transfers**: Asset transfer history with detailed audit trail and location tracking
- **Repairs**: Repair tracking system with status management and expected return dates
- **Relations**: Proper foreign key relationships ensuring data integrity

### Authentication System
- **Primary**: Session-based authentication using Express sessions stored in PostgreSQL
- **Fallback**: Token-based authentication stored in localStorage for reliability
- **Authorization**: Role-based access control with different permission levels
- **Registration**: Configurable registration with invitation code system

### User Interface
- **Dashboard**: Overview with key metrics and statistics
- **Asset Management**: Add, view, edit, and delete assets with comprehensive forms
- **Transfer System**: Asset transfer workflow with location and custodian tracking
- **Repair Tracking**: Send assets for repair and track repair status
- **User Management**: Admin interface for managing users and roles (admin only)

## Data Flow

1. **Authentication Flow**: Users log in via session-based auth with token fallback
2. **Asset Lifecycle**: Assets are created → can be transferred → may go for repair → return to active status
3. **Permission Model**: Role-based permissions control access to different features
4. **State Management**: TanStack Query handles server state with automatic caching and revalidation

## External Dependencies

### Production Dependencies
- **Database**: `@neondatabase/serverless`, `drizzle-orm` for PostgreSQL connectivity
- **Authentication**: `express-session`, `connect-pg-simple` for session management
- **Validation**: `zod` for runtime type validation
- **UI Components**: Full Radix UI ecosystem for accessible components
- **Forms**: `react-hook-form` with `@hookform/resolvers` for form handling

### Development Dependencies
- **Build Tools**: `vite`, `typescript`, `tsx` for development and build process
- **Database Tools**: `drizzle-kit` for schema management and migrations
- **Styling**: `tailwindcss`, `autoprefixer` for CSS processing

## Deployment Strategy

### Environment Configuration
- **Required Environment Variables**: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`
- **Optional Variables**: `PORT` (defaults to 5000), `SQL_SERVER` for alternative database

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database Setup**: Drizzle pushes schema to database
4. **Production Start**: Node.js serves built application

### Platform Support
- **Primary Target**: Heroku with PostgreSQL addon
- **Alternative**: Any Node.js hosting with PostgreSQL database
- **Development**: Local development with hot reload and database connection

### Key Architectural Decisions

1. **Database Choice**: PostgreSQL chosen for ACID compliance and robust relational features needed for asset tracking
2. **ORM Selection**: Drizzle ORM selected for type safety and performance over heavier alternatives
3. **Authentication Strategy**: Session-based auth with token fallback provides reliability across different deployment scenarios
4. **UI Framework**: shadcn/ui chosen for consistency, accessibility, and customization while maintaining design system coherence
5. **State Management**: TanStack Query selected for its excellent caching, background updates, and developer experience
6. **Build Tool**: Vite chosen for fast development builds and excellent TypeScript integration

The system is designed to be maintainable, scalable, and suitable for organizations needing comprehensive asset management with proper audit trails and role-based access control.

## Deployment Configuration

### Multi-Platform Deployment Support
- **Cloud Platforms**: Ready for Heroku, Render, Railway, and other Node.js hosting platforms
- **Database**: PostgreSQL with automatic connection via DATABASE_URL environment variable
- **Environment Variables**: Secure configuration management for sensitive data
- **Health Monitoring**: Built-in API endpoints for application health checks

### Deployment Files Created
- `.gitignore` - Comprehensive exclusion of sensitive files, development artifacts, and build outputs
- `DEPLOYMENT.md` - Complete deployment guide with platform-specific instructions and environment setup
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step verification checklist for successful deployment
- `Procfile` - Heroku process definition for web service startup
- `app.json` - Heroku app configuration with PostgreSQL addon and environment variables
- `render.yaml` - Render platform deployment configuration with database provisioning

### Build and Deployment Process
1. **Dependency Installation**: `npm install` installs all production dependencies
2. **Frontend Build**: Vite builds React application to `dist/public`
3. **Backend Bundle**: esbuild creates optimized server bundle at `dist/index.js`
4. **Database Migration**: `npm run db:push` sets up database schema
5. **Production Start**: `npm start` launches the application server

### Recent Updates (July 25, 2025)
- ✓ **Complete dark mode system** with light/dark/system theme options and persistent theme switching
- ✓ **Role-Based SQL Server Authentication** implemented with two-tier connection architecture
- ✓ **Dynamic connection switching** from low-privilege authentication user to role-specific users
- ✓ **SQL Server Authentication support** equivalent to Python ODBC connection strings
- ✓ **Comprehensive connection testing tools** with detailed diagnostics and troubleshooting
- ✓ **Enterprise-grade security model** with principle of least privilege and connection isolation
- ✓ **Production-ready authentication flow** matching requested john → role-based user pattern
- ✓ **SQL Server connection established** at 163.227.186.23:2499 with TCP filtering bypass
- ✓ **Dual authentication system** supporting both email and username login with flexible validation
- ✓ **Enhanced UI navigation** with back button from Connection Test utility to login page
- ✓ **SQL Query Testing Tool** with established connection requirement and comprehensive error handling
- ✓ **Comprehensive code documentation** with line-by-line comments and architectural explanations
- ✓ **Connection state management** ensuring queries only run after successful connection verification
- ✓ **Database schema mapping** documentation for UserID, Username, Email, Role, IsActive columns
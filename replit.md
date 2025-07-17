# Asset Management System

## Overview

This is a full-stack asset management system built with React (frontend) and Express.js (backend). The application allows users to track, transfer, and manage organizational assets with features for repairs, warranties, and comprehensive reporting. It uses a modern tech stack with TypeScript, shadcn/ui components, Drizzle ORM, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with TypeScript support

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful API with JSON responses
- **Development**: Hot reload with Vite integration in development mode

### Project Structure
```
├── client/           # React frontend
├── server/           # Express backend
├── shared/           # Shared types and schemas
├── migrations/       # Database migrations
└── dist/            # Production build output
```

## Key Components

### Database Schema (shared/schema.ts)
- **Users**: Authentication and user management
- **Assets**: Core asset tracking with detailed metadata
- **Transfers**: Asset transfer history and tracking
- **Repairs**: Repair tracking and status management

### Authentication System
- Session-based authentication using Express sessions
- Protected routes with authentication middleware
- User login/logout functionality with automatic session management

### Asset Management Features
- Asset creation with comprehensive metadata
- Transfer tracking between locations and custodians
- Repair status monitoring with expected return dates
- Warranty and insurance tracking
- Loss and damage recording

### UI Components
- Responsive design with mobile support
- Consistent component library using shadcn/ui
- Form validation with real-time feedback
- Toast notifications for user feedback
- Loading states and error handling

## Data Flow

1. **Client Requests**: React components make API calls using TanStack Query
2. **Authentication**: Middleware validates session before accessing protected routes
3. **Data Processing**: Express routes handle business logic and data validation
4. **Database Operations**: Drizzle ORM manages PostgreSQL interactions
5. **Response Handling**: JSON responses with appropriate status codes
6. **State Updates**: TanStack Query automatically updates UI with fresh data

## External Dependencies

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight client-side routing
- **react-hook-form**: Form handling and validation
- **@hookform/resolvers**: Zod integration for form validation
- **date-fns**: Date manipulation and formatting
- **lucide-react**: Icon library

### Backend Dependencies
- **drizzle-orm**: TypeScript ORM for PostgreSQL
- **@neondatabase/serverless**: Neon PostgreSQL adapter
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **zod**: Runtime type validation

### Development Dependencies
- **drizzle-kit**: Database migration and introspection tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Mode
- Vite dev server with hot reload for frontend
- tsx with nodemon-like behavior for backend
- Integrated development setup with proxy configuration

### Production Build
1. **Frontend**: Vite builds optimized React bundle to `dist/public`
2. **Backend**: esbuild bundles Express server to `dist/index.js`
3. **Database**: Drizzle migrations ensure schema consistency
4. **Environment**: Production mode serves static files and API from single process

### Database Management
- Drizzle migrations for schema versioning
- PostgreSQL as primary database with connection pooling
- Environment-based configuration for different deployment stages

### Key Features
- **Asset Lifecycle Management**: Complete tracking from acquisition to disposal
- **Multi-location Support**: Track assets across different physical locations
- **Custodian Management**: Assign and track asset responsibility
- **Repair Workflow**: Monitor assets under repair with expected return dates
- **Insurance & Warranty Tracking**: Maintain important asset documentation
- **Audit Trail**: Complete history of all asset transfers and status changes
# System Architecture & Component Connections

## Overview
This document describes the complete architecture of the Inventory Management System, detailing how all components, pages, and files are connected and the flow of control and execution.

## System Components Overview

### Frontend Architecture (React + TypeScript)
```
client/
├── src/
│   ├── pages/           # Page components (views)
│   ├── components/      # Reusable UI components
│   ├── lib/            # Utilities and client libraries
│   └── App.tsx         # Main application router
```

### Backend Architecture (Express + TypeScript)
```
server/
├── index.ts             # Application entry point
├── routes.ts            # API route definitions
├── connection-manager.ts # SQL Server connection management
├── role-based-storage.ts # Role-based database operations
├── storage.ts           # Storage interface definitions
└── vite.ts              # Development server integration
```

### Shared Architecture (Common Types)
```
shared/
└── schema.ts            # Database schema and validation types
```

## Detailed Component Connections

### 1. Authentication Flow

#### Login Process:
```
client/pages/Login.tsx
    ↓ [User submits credentials]
server/routes.ts (/api/auth/login)
    ↓ [Calls authenticateUser]
server/connection-manager.ts
    ↓ [john_login_user connection]
SQL Server Users Table
    ↓ [Returns user + role credentials]
server/connection-manager.ts
    ↓ [Creates role-specific connection]
server/role-based-storage.ts
    ↓ [Stores session connection]
client/App.tsx
    ↓ [Redirects to Dashboard]
```

#### Connection Architecture:
1. **Authentication Layer**: `john_login_user` (read-only access to Users table)
2. **Role Layer**: Role-specific users (`admin_user`, `manager_user`, etc.)
3. **Session Management**: Connection pooling per user session

### 2. Data Flow Architecture

#### Page Component → API → Database Flow:
```
React Page Component
    ↓ [useQuery/useMutation via TanStack Query]
client/lib/queryClient.ts
    ↓ [HTTP requests to API endpoints]
server/routes.ts
    ↓ [Route handlers call storage methods]
server/role-based-storage.ts
    ↓ [SQL queries via role-specific connections]
SQL Server Database
    ↓ [Returns data]
React Component
    ↓ [UI updates]
```

### 3. File-by-File Connections

#### Core Files and Their Relationships:

**server/index.ts**
- **Role**: Application entry point and server initialization
- **Connects to**:
  - `server/routes.ts` (mounts API routes)
  - `server/vite.ts` (development server)
  - `server/role-based-storage.ts` (initializes storage)
- **Responsibilities**:
  - Express server setup
  - Middleware configuration
  - Environment variable loading
  - Storage initialization

**server/connection-manager.ts**
- **Role**: SQL Server connection management and authentication
- **Connects to**:
  - `server/role-based-storage.ts` (provides connections)
  - `server/routes.ts` (authentication endpoint)
- **Responsibilities**:
  - Two-tier authentication system
  - Connection pooling
  - Session management
  - Database credential extraction

**server/role-based-storage.ts**
- **Role**: Database operations with role-based access control
- **Connects to**:
  - `server/connection-manager.ts` (gets connections)
  - `server/routes.ts` (implements storage interface)
  - `shared/schema.ts` (type definitions)
- **Responsibilities**:
  - CRUD operations for all entities
  - Role-based query execution
  - Session-specific database access

**server/routes.ts**
- **Role**: API endpoint definitions and request handling
- **Connects to**:
  - `server/role-based-storage.ts` (database operations)
  - `server/connection-manager.ts` (authentication)
  - `shared/schema.ts` (validation schemas)
- **Responsibilities**:
  - RESTful API endpoints
  - Request validation
  - Response formatting
  - Error handling

**client/src/App.tsx**
- **Role**: Main application router and layout
- **Connects to**:
  - All page components (`pages/`)
  - `client/lib/queryClient.ts` (API client setup)
- **Responsibilities**:
  - Route configuration
  - Authentication state management
  - Layout structure
  - Global providers

**shared/schema.ts**
- **Role**: Type definitions and validation schemas
- **Connects to**:
  - All server files (type safety)
  - All client components (form validation)
- **Responsibilities**:
  - Database schema definitions
  - Zod validation schemas
  - TypeScript type exports

## Control Flow Execution

### 1. Application Startup
```
1. server/index.ts loads environment variables
2. Express server initialization
3. server/role-based-storage.ts initializes SQL Server storage
4. server/connection-manager.ts establishes john_login_user connection
5. server/routes.ts mounts API endpoints
6. Vite development server starts (if NODE_ENV=development)
7. React application loads in browser
8. client/App.tsx initializes routing and providers
```

### 2. User Authentication
```
1. User visits application → redirected to Login page
2. client/pages/Login.tsx renders login form
3. User submits credentials
4. Form validation via shared/schema.ts
5. POST request to /api/auth/login via queryClient
6. server/routes.ts receives request
7. server/connection-manager.ts authenticateUser()
8. john_login_user queries Users table
9. Role credentials extracted from database
10. Role-specific connection created
11. Session stored in role-based-storage
12. Authentication success response
13. client/App.tsx redirects to Dashboard
```

### 3. Data Operations (Example: Asset Management)
```
1. User navigates to Assets page
2. client/pages/Assets.tsx loads
3. useQuery hook fetches data via queryClient
4. GET request to /api/assets
5. server/routes.ts asset routes handler
6. server/role-based-storage.ts getAssets()
7. SQL query executed with user's role-specific connection
8. Results returned through the chain
9. React component updates UI
10. User interactions trigger mutations
11. Optimistic updates and cache invalidation
```

## Security Architecture

### Connection Isolation
- Each user session has isolated database connection
- Role-based permissions enforced at database level
- No cross-user data leakage possible

### Authentication Security
- Two-tier authentication prevents privilege escalation
- john_login_user has minimal permissions
- Role passwords stored securely in Users table

### Data Access Control
- All database operations go through role-specific connections
- Users can only access data their role permits
- Session-based access control

## Performance Considerations

### Connection Pooling
- Efficient connection reuse per session
- Automatic connection cleanup on session end
- Configurable pool sizes

### Caching Strategy
- TanStack Query provides client-side caching
- Optimistic updates for better user experience
- Smart cache invalidation on mutations

### Database Optimization
- Parameterized queries prevent SQL injection
- Connection reuse reduces overhead
- Role-based access improves security

## Error Handling Flow

### Database Errors
```
SQL Server Error
    ↓
server/role-based-storage.ts catches error
    ↓
server/routes.ts returns formatted error response
    ↓
client/queryClient.ts receives error
    ↓
React component displays error state
```

### Authentication Errors
```
Invalid credentials
    ↓
server/connection-manager.ts returns null
    ↓
server/routes.ts returns 401 Unauthorized
    ↓
client/App.tsx redirects to login
    ↓
User sees error message
```

This architecture ensures secure, scalable, and maintainable inventory management with proper separation of concerns and robust error handling.
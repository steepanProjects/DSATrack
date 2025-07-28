# DSA Progress Tracker

## Overview

This is a full-stack web application called "DSA Progress Tracker" that helps students track their progress through Data Structures and Algorithms problems. The application provides a comprehensive dashboard for students to monitor their learning journey and allows administrators to manage student accounts and track overall progress.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Session-based authentication using express-session with PostgreSQL session store
- **Password Hashing**: Built-in Node.js crypto module with scrypt

### Database Architecture
- **Database**: PostgreSQL (configured for Neon hosting)
- **ORM**: Drizzle ORM with Zod schema validation
- **Migration**: Drizzle Kit for database migrations

## Key Components

### Database Schema
The application uses 6 main tables:
- `students`: Student information and authentication
- `admin`: Admin user authentication
- `problems`: DSA problem catalog
- `student_progress`: Tracks problem completion status
- `student_notes`: Personal notes per problem
- `bookmarks`: Student bookmarked problems

### Authentication System
- Session-based authentication without JWT
- Separate login flows for students (registration number) and admin (username)
- Password hashing using Node.js crypto scrypt function
- Session persistence using PostgreSQL session store

### Data Seeding
- Automatic database seeding from text files in `attached_assets/`
- Student data loaded from `namelist.txt`
- Problem data parsed from `DSA_Learning_Path_Categorized.txt`
- Default password "12345678" for all seeded students

### Student Features
- Problem tracking with three statuses: Not Started, In Progress, Completed
- Personal notes and bookmarking system
- Dashboard with multiple chart visualizations
- Search, filter, and sort functionality
- Password change capability

### Admin Features
- Student management (add, view, delete)
- Progress monitoring across all students
- Password reset functionality
- CSV export capabilities

## Data Flow

1. **Authentication Flow**: Users login through session-based auth, with separate endpoints for students and admin
2. **Problem Management**: Problems are seeded once from text files and stored in PostgreSQL
3. **Progress Tracking**: Student interactions update progress status in real-time
4. **Dashboard Updates**: Charts and statistics are calculated server-side and cached using React Query

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for Neon hosting
- **drizzle-orm**: Type-safe database queries
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **bcrypt**: Password hashing (note: project uses Node crypto instead)

### UI Dependencies
- **@radix-ui/***: Comprehensive UI primitives
- **@tanstack/react-query**: Server state management
- **recharts**: Chart visualization library
- **react-hook-form**: Form handling
- **zod**: Schema validation

### Development Dependencies
- **vite**: Build tool and dev server
- **tsx**: TypeScript execution
- **tailwindcss**: Utility-first CSS framework

## Deployment Strategy

### Build Process
- Frontend: Vite builds React app to `dist/public`
- Backend: esbuild bundles Express server to `dist/index.js`
- Single deployment artifact with static file serving

### Environment Configuration
- PostgreSQL connection via `DATABASE_URL` environment variable
- Session secret configurable via `SESSION_SECRET`
- Development/production mode detection via `NODE_ENV`

### Database Management
- Schema managed through Drizzle migrations
- Seeding handled automatically on first run
- Connection pooling for production scalability

The application follows a monorepo structure with clear separation between client, server, and shared code, making it maintainable and scalable for educational use cases.
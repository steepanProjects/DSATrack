# DSA Progress Tracker

A comprehensive Data Structures and Algorithms progress tracking application with separate admin and student dashboards.

## Features

### Student Features
- Track progress through 455+ DSA problems
- Visual progress charts and analytics
- Personal notes and bookmarking system
- Category-based problem organization
- Mobile-responsive interface

### Admin Features
- Student management (add, view, delete)
- Goal creation and tracking system
- Progress analytics and reports
- CSV export/import functionality
- Real-time statistics dashboard

## Tech Stack

- **Frontend**: React 18 + TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js + Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication
- **Deployment**: Render.com

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd dsa-progress-tracker
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

4. Push database schema
```bash
npm run db:push
```

5. Start development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Default Admin Credentials
- Username: `admin`
- Password: `admin@123`

## Deployment on Render

1. Connect your GitHub repository to Render
2. Use the `render.yaml` configuration file provided
3. Set up PostgreSQL database on Render
4. Deploy the web service

### Environment Variables for Production
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption
- `NODE_ENV`: Set to `production`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes

## Database Schema

The application uses 6 main tables:
- `students` - Student information and authentication
- `admin` - Admin user authentication
- `problems` - DSA problem catalog
- `student_progress` - Problem completion tracking
- `student_notes` - Personal notes per problem
- `bookmarks` - Student bookmarked problems
- `admin_goals` - Admin-created goals
- `student_admin_goals` - Student progress on admin goals

## License

MIT License
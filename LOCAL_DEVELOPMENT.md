# Local Development Setup

This guide will help you set up a local development environment for the Lead Manager application using Docker for the PostgreSQL database and seed data.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

## Setup Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/lead-manager.git
cd lead-manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the PostgreSQL Database with Docker

```bash
npm run docker:up
```

This will start a PostgreSQL database in a Docker container using the configuration in `docker-compose.yml`.

### 4. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following content:

```
# Database URL for Prisma (Docker PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lead_manager"

# NextAuth configuration
NEXTAUTH_SECRET="your-nextauth-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Admin user credentials
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="adminpassword"

# Member user credentials
MEMBER_EMAIL="member@example.com"
MEMBER_PASSWORD="memberpassword"
```

### 5. Run Prisma Migrations

```bash
npm run db:migrate
```

This will create the database schema based on your Prisma models.

### 6. Seed the Database

```bash
npm run db:seed
```

This will populate the database with sample data including:

- Users (admin and member)
- Outreach sequences
- Campaigns
- Districts and district contacts (for Avalern)
- Leads (for CraftyCode)
- Touchpoints

### 7. Start the Development Server

```bash
npm run dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000).

## Quick Setup

To perform steps 3-6 in one command, run:

```bash
npm run db:setup
```

## Login Credentials

Use these credentials to log in to the application:

- **Admin User**
  - Email: admin@example.com
  - Password: adminpassword
  - Access: Both Avalern and CraftyCode

- **Member User**
  - Email: member@example.com
  - Password: memberpassword
  - Access: Avalern only

## Useful Commands

- **Start the database**: `npm run docker:up`
- **Stop the database**: `npm run docker:down`
- **Open Prisma Studio**: `npm run db:studio` (GUI for exploring and editing data)
- **Reset the database**: `npm run db:reset` (Caution: This will delete all data)
- **Run migrations**: `npm run db:migrate`
- **Seed the database**: `npm run db:seed`

## Sample Data

The seed script creates the following sample data:

### Users
- Admin user with access to both companies
- Member user with access to Avalern only

### Companies
- Avalern (Educational technology)
- CraftyCode (Real estate web development)

### Campaigns
- California School Districts Q3 2025 (Avalern)
- San Fernando Valley Real Estate Q3 2025 (CraftyCode)

### Districts (Avalern)
- Los Angeles Unified School District
- San Diego Unified School District
- Fresno Unified School District
- Long Beach Unified School District
- Elk Grove Unified School District

### District Contacts (Avalern)
- 5 contacts across different districts with various statuses

### Leads (CraftyCode)
- 5 real estate leads with various statuses

### Touchpoints
- Various email and call touchpoints for both district contacts and leads
- Mix of completed and scheduled touchpoints

## Troubleshooting

### Database Connection Issues

If you have problems connecting to the database:

1. Make sure Docker is running
2. Check if the PostgreSQL container is running: `docker ps`
3. Check the container logs: `docker logs lead-manager-db`
4. Verify your DATABASE_URL in .env.local

### Prisma Issues

If you encounter Prisma-related errors:

1. Regenerate the Prisma client: `npx prisma generate`
2. Reset the database if needed: `npm run db:reset`
3. Check for schema conflicts: `npx prisma validate`

### Docker Issues

If you have problems with Docker:

1. Restart Docker Desktop
2. Force recreate the containers: `docker-compose up -d --force-recreate`
3. Remove volumes if needed: `docker-compose down -v` 
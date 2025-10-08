# Database Setup Guide

This guide will help you set up your database using Docker for local development.

## Overview

The project uses a local PostgreSQL database via Docker for development.

## Quick Setup

Run the complete setup command:

```bash
npm run db:setup
```

This will start the Docker container, run migrations, and seed the database.

## Manual Setup

### 1. Start the Database

```bash
npm run docker:up
```

This starts a PostgreSQL container on port 5433.

### 2. Configure Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Database URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/tiny_crm"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Environment
NODE_ENV="development"
```

### 3. Set Up the Database

```bash
# Run migrations
npm run db:migrate

# Seed the database
npm run db:seed
```

## Available Scripts

### Development (Local Docker)
```bash
npm run docker:up          # Start local PostgreSQL
npm run docker:down        # Stop local PostgreSQL
npm run db:migrate         # Run migrations
npm run db:seed           # Seed the database
npm run db:setup          # Complete setup (up + migrate + seed)
npm run db:studio         # Open Prisma Studio
npm run db:reset          # Reset the database
```

### Testing
```bash
npm run test              # Run tests
npm run test:run          # Run tests only
```

## Database Schema

The database schema is defined in `prisma/schema.prisma` and includes:

- **Users**: Application users with roles and company access
- **Campaigns**: Marketing campaigns with leads and districts
- **Leads**: Contact information and status tracking
- **Districts**: School district information
- **DistrictContacts**: Contacts within districts
- **OutreachSequences**: Automated outreach workflows
- **Touchpoints**: Communication history
- **Assignments**: User assignments to leads and districts

## Migration Strategy

### Development
- Use `prisma migrate dev` for schema changes
- Migrations are applied immediately
- Schema is automatically updated

## Troubleshooting

### Connection Issues
1. Verify Docker is running
2. Check that the container is started: `docker ps`
3. Ensure port 5433 is not in use by another service
4. Verify the connection string in your `.env` file

### Migration Issues
1. Ensure the database container is running
2. Check that the database exists
3. Verify you have the necessary permissions
4. Check the migration history

### Environment Issues
1. Verify `NODE_ENV` is set correctly
2. Check that all required environment variables are set
3. Restart your application after changing environment variables

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong passwords** for production databases
3. **Rotate database passwords** regularly
4. **Backup your data** regularly

## Support

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com/)
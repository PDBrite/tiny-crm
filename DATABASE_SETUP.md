# Database Setup Guide

This guide will help you set up your database to run on Neon for both test and production environments.

## Overview

The project supports three database environments:
- **Development**: Local PostgreSQL via Docker
- **Test**: Neon PostgreSQL for testing
- **Production**: Neon PostgreSQL for production

## Quick Setup

Run the automated setup script:

```bash
npm run setup:neon
```

This will create your `.env` file and provide step-by-step instructions.

## Manual Setup

### 1. Create Neon Projects

1. Go to [Neon Console](https://console.neon.tech)
2. Create an account if you don't have one
3. Create two projects:
   - `lead-manager-test` (for testing)
   - `lead-manager-prod` (for production)

### 2. Get Database Connection Strings

For each project:
1. Go to the project dashboard
2. Click on "Connection Details"
3. Copy the connection string
4. Replace `username`, `password`, and `database` with your actual values

### 3. Configure Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Development (local Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/lead_manager"

# Test Environment (Neon)
TEST_DATABASE_URL="postgresql://username:password@ep-test-123456.us-east-1.aws.neon.tech/lead_manager_test?sslmode=require"

# Production Environment (Neon)
PRODUCTION_DATABASE_URL="postgresql://username:password@ep-prod-123456.us-east-1.aws.neon.tech/lead_manager_prod?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Environment
NODE_ENV="development"
```

### 4. Set Up Databases

Run the following commands to set up your databases:

```bash
# For test environment
npm run db:test:setup

# For production environment
npm run db:prod:setup
```

## Available Scripts

### Development (Local Docker)
```bash
npm run docker:up          # Start local PostgreSQL
npm run db:migrate         # Run migrations
npm run db:seed           # Seed the database
npm run db:setup          # Complete setup (up + migrate + seed)
npm run db:studio         # Open Prisma Studio
```

### Test Environment (Neon)
```bash
npm run db:test:migrate   # Deploy migrations to test DB
npm run db:test:seed      # Seed test database
npm run db:test:setup     # Complete test setup
npm run db:test:reset     # Reset test database
```

### Production Environment (Neon)
```bash
npm run db:prod:migrate   # Deploy migrations to production DB
npm run db:prod:seed      # Seed production database
npm run db:prod:setup     # Complete production setup
npm run db:prod:reset     # Reset production database (⚠️ Use with caution!)
```

### Testing
```bash
npm run test              # Run tests with test database
npm run test:run          # Run tests only (assumes DB is set up)
```

### Building
```bash
npm run build:test        # Build for test environment
npm run build:prod        # Build for production environment
```

## Environment-Specific Configuration

The application automatically detects the environment and uses the appropriate database:

- **Development** (`NODE_ENV=development`): Uses `DATABASE_URL`
- **Test** (`NODE_ENV=test`): Uses `TEST_DATABASE_URL`
- **Production** (`NODE_ENV=production`): Uses `PRODUCTION_DATABASE_URL`

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

### Test/Production
- Use `prisma migrate deploy` to apply existing migrations
- No schema changes are made
- Safe for production environments

## Troubleshooting

### Connection Issues
1. Verify your connection strings are correct
2. Check that your Neon projects are active
3. Ensure your IP is whitelisted (if required)
4. Verify SSL mode is set to `require`

### Migration Issues
1. Ensure you're using the correct environment
2. Check that the database exists
3. Verify you have the necessary permissions
4. Check the migration history

### Environment Issues
1. Verify `NODE_ENV` is set correctly
2. Check that all required environment variables are set
3. Restart your application after changing environment variables

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different databases** for test and production
3. **Rotate database passwords** regularly
4. **Use connection pooling** for production
5. **Monitor database usage** and costs
6. **Backup your data** regularly

## Cost Optimization

Neon offers a generous free tier:
- 3 projects
- 0.5 GB storage
- 10 GB transfer per month

For production use, consider:
- Monitoring usage to stay within limits
- Upgrading to paid plans as needed
- Using connection pooling to reduce costs

## Support

- [Neon Documentation](https://neon.tech/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs) 
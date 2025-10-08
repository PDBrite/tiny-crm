# Migrating from Supabase to Prisma

This document outlines the process of migrating the Tiny CRM application from direct Supabase database access to using Prisma ORM with Supabase as the PostgreSQL provider.

## Why Prisma?

1. **Type Safety**: Prisma provides fully type-safe database access with generated TypeScript types.
2. **Developer Experience**: Simplified database operations with IntelliSense support.
3. **Schema Management**: Declarative schema definition and migrations.
4. **Query Building**: Powerful and intuitive query API.
5. **Consistency**: Unified data access pattern across the application.

## Migration Steps

### 1. Install Prisma Dependencies

```bash
npm install prisma @prisma/client
npx prisma init
```

### 2. Configure Database Connection

Update the `.env` file with your database connection URL:

```env
# Local development (Supabase local)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Production (Supabase hosted)
# DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### 3. Create Prisma Schema

Define your database schema in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Define your models here...
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Create Prisma Client Utility

Create a file at `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 6. Replace Supabase Client Usage

#### Before:

```typescript
import { supabase } from '@/lib/supabase'

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
  
  if (error) throw error
  return data
}
```

#### After:

```typescript
import { prisma } from '@/lib/prisma'

export async function getUsers() {
  return await prisma.user.findMany()
}
```

### 7. Handling Authentication

If you decide to continue using Supabase Auth, you can keep the authentication-related parts of the Supabase client while using Prisma for database access.

### 8. Handling Relations

#### Before (with Supabase):

```typescript
const { data } = await supabase
  .from('campaigns')
  .select(`
    *,
    outreach_sequence:outreach_sequences(id, name, description)
  `)
```

#### After (with Prisma):

```typescript
const campaigns = await prisma.campaign.findMany({
  include: {
    outreachSequence: {
      select: {
        id: true,
        name: true,
        description: true
      }
    }
  }
})
```

## Benefits of the Migration

1. **Better Type Safety**: Prisma provides fully type-safe database access.
2. **Improved Developer Experience**: Auto-completion and IntelliSense for database operations.
3. **Schema Management**: Easier schema evolution with Prisma migrations.
4. **Query Optimization**: Prisma optimizes queries and prevents N+1 query problems.
5. **Consistency**: Unified data access pattern across the application.

## Potential Challenges

1. **Learning Curve**: Team members need to learn Prisma's API.
2. **Migration Complexity**: Converting complex Supabase queries to Prisma.
3. **Authentication**: If using Supabase Auth, need to integrate with Prisma.

## Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma with Next.js](https://www.prisma.io/nextjs)
- [Prisma Migration Guide](https://www.prisma.io/docs/guides/migrate-to-prisma) 
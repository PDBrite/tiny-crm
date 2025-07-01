# Prisma Migration: Next Steps

This document outlines the remaining steps to complete the migration from Supabase to Prisma for database access in the Lead Manager application.

## Completed Steps

1. ✅ Installed Prisma dependencies
2. ✅ Created Prisma schema based on existing database structure
3. ✅ Set up Prisma client utility in `src/lib/prisma.ts`
4. ✅ Created a warning stub for the Supabase client that directs developers to use Prisma
5. ✅ Updated sample API routes to use Prisma instead of Supabase:
   - ✅ Users API (`src/app/api/users/route.ts`)
   - ✅ Campaigns API (`src/app/api/campaigns/route.ts`)
   - ✅ Districts API (`src/app/api/districts/route.ts`)

## Remaining Steps

### 1. Update API Routes

Update all remaining API routes to use Prisma instead of Supabase. Here's a list of files that need to be updated:

- [ ] `src/app/api/assign-districts-to-campaign/route.ts`
- [ ] `src/app/api/campaign-data/route.ts`
- [ ] `src/app/api/campaign-districts/route.ts`
- [ ] `src/app/api/campaign-leads/route.ts`
- [ ] `src/app/api/campaign-touchpoints/route.ts`
- [ ] `src/app/api/create-daily-batch/route.ts`
- [ ] `src/app/api/daily-touchpoints/route.ts`
- [ ] `src/app/api/district-contacts/route.ts`
- [ ] `src/app/api/import-districts/route.ts`
- [ ] `src/app/api/outreach-sequences/route.ts`
- [ ] `src/app/api/sync-instantly/route.ts`
- [ ] `src/app/api/test-company/route.ts`
- [ ] `src/app/api/test-district-contacts/route.ts`
- [ ] `src/app/api/touchpoint-counts/route.ts`
- [ ] `src/app/api/touchpoints/route.ts`
- [ ] `src/app/api/touchpoints/batch/route.ts`

### 2. Update Client Components and Pages

Update all client components and pages that use Supabase directly:

- [ ] `src/app/campaigns/[id]/page.tsx`
- [ ] `src/app/campaigns/page.tsx`
- [ ] `src/app/campaigns/select-districts/page.tsx`
- [ ] `src/app/campaigns/select-leads/page.tsx`
- [ ] `src/app/districts/page.tsx`
- [ ] `src/app/import/page.tsx`
- [ ] `src/app/leads/page.tsx`
- [ ] `src/app/outreach-sequences/[id]/page.tsx`
- [ ] `src/app/outreach-sequences/page.tsx`
- [ ] `src/app/(dashboard)/dashboard/page.tsx`
- [ ] `src/hooks/useLeads.ts`

### 3. Testing

1. **Unit Tests**:
   - [ ] Create unit tests for Prisma client functions
   - [ ] Test each API route with Prisma

2. **Integration Tests**:
   - [ ] Test the full application flow with Prisma
   - [ ] Verify all CRUD operations work correctly

3. **Edge Cases**:
   - [ ] Test error handling
   - [ ] Test authentication and authorization
   - [ ] Test with large datasets

### 4. Performance Optimization

1. **Query Optimization**:
   - [ ] Review and optimize complex queries
   - [ ] Use Prisma's query optimization features

2. **Connection Pooling**:
   - [ ] Set up connection pooling for production

### 5. Documentation

1. **Update API Documentation**:
   - [ ] Document the new Prisma-based API endpoints

2. **Update Developer Documentation**:
   - [ ] Update development setup instructions
   - [ ] Document Prisma schema and migrations

### 6. Deployment

1. **Environment Variables**:
   - [ ] Update environment variables in production

2. **Database Migration**:
   - [ ] Run Prisma migrations in production

3. **Monitoring**:
   - [ ] Set up monitoring for database performance
   - [ ] Monitor for any migration-related issues

## Migration Strategy

For a smooth transition, we recommend the following approach:

1. **Incremental Migration**: Update one API route at a time, starting with less critical ones
2. **Parallel Implementation**: Temporarily support both Supabase and Prisma access for critical routes
3. **Feature Flags**: Use feature flags to gradually roll out Prisma-based implementations
4. **Rollback Plan**: Have a plan to roll back to Supabase if issues arise

## Common Patterns for Migration

### Fetching Records

#### Supabase:
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select('*')
  .eq('company', 'Avalern')
```

#### Prisma:
```typescript
const campaigns = await prisma.campaign.findMany({
  where: { company: 'Avalern' }
})
```

### Creating Records

#### Supabase:
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .insert({ name, company })
  .select()
  .single()
```

#### Prisma:
```typescript
const campaign = await prisma.campaign.create({
  data: { name, company }
})
```

### Updating Records

#### Supabase:
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .update({ status: 'active' })
  .eq('id', campaignId)
  .select()
  .single()
```

#### Prisma:
```typescript
const campaign = await prisma.campaign.update({
  where: { id: campaignId },
  data: { status: 'active' }
})
```

### Deleting Records

#### Supabase:
```typescript
const { error } = await supabase
  .from('campaigns')
  .delete()
  .eq('id', campaignId)
```

#### Prisma:
```typescript
await prisma.campaign.delete({
  where: { id: campaignId }
})
```

### Joins/Relations

#### Supabase:
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select(`
    *,
    leads(*)
  `)
  .eq('id', campaignId)
```

#### Prisma:
```typescript
const campaign = await prisma.campaign.findUnique({
  where: { id: campaignId },
  include: { leads: true }
})
```

## Conclusion

By following these steps, we can successfully migrate from Supabase to Prisma while maintaining application functionality and improving developer experience. The migration should be done incrementally to minimize disruption and ensure a smooth transition. 
/**
 * DEPRECATED: This file is kept only for backward compatibility.
 * 
 * All database access should now use Prisma instead of Supabase.
 * 
 * Import the Prisma client from '@/lib/prisma' instead.
 * 
 * Example:
 * ```
 * import { prisma } from '@/lib/prisma';
 * 
 * // Instead of:
 * // const { data } = await supabase.from('users').select('*');
 * 
 * // Use:
 * const users = await prisma.user.findMany();
 * ```
 */

import { Database } from '@/types/database'

// These environment variables are kept for potential Supabase Auth usage in the future
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.warn('DEPRECATED: Using Supabase client directly is deprecated. Use Prisma instead.')

// This is a stub implementation that throws an error when used
// It will help identify places where Supabase is still being used for database access
const createErrorProxy = () => {
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'auth') {
        // Allow auth methods to pass through if we decide to use Supabase Auth
        return { signIn: () => {}, signOut: () => {}, getSession: () => {} };
      }
      
      // For database methods, throw an error
      if (['from', 'rpc', 'storage'].includes(prop.toString())) {
        throw new Error(
          `DEPRECATED: Using Supabase for database access is no longer supported. Use Prisma instead. 
          Import { prisma } from '@/lib/prisma' and use the Prisma client API.`
        );
      }
      
      return createErrorProxy();
    },
    apply: () => {
      throw new Error(
        `DEPRECATED: Using Supabase for database access is no longer supported. Use Prisma instead. 
        Import { prisma } from '@/lib/prisma' and use the Prisma client API.`
      );
    }
  });
};

// Export stubs that will throw errors when used for database access
export const supabase = createErrorProxy();
export const supabaseAdmin = createErrorProxy();
export const createClientComponentClient = () => createErrorProxy();

// Keep test function but make it use Prisma
export async function testSupabaseConnection() {
  try {
    // Import dynamically to avoid circular dependencies
    const { prisma } = await import('./prisma');
    await prisma.user.count();
    
    return { 
      success: true, 
      data: { count: 'Connection successful via Prisma' } 
    };
  } catch (err) {
    console.error('Database connection test error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown connection error' 
    };
  }
} 
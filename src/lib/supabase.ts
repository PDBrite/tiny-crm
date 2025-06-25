import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Add debugging information
if (typeof window === 'undefined') {
  // Server-side logging
  console.log('Supabase Configuration:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    urlStartsWith: supabaseUrl?.substring(0, 20) + '...',
  })
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable session persistence for server-side
  },
})

// Service role client that bypasses RLS policies
// Important: This client is intended for server-side use only.
// It will be null on the client-side to avoid leaking the service role key.
export const supabaseAdmin =
  typeof window === 'undefined' && supabaseServiceKey
    ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
      })
    : null

// Client-side Supabase client
export function createClientComponentClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Connection test function
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('campaigns').select('count').limit(1)
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Supabase connection successful')
    return { success: true, data }
  } catch (err) {
    console.error('Supabase connection test error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown connection error' 
    }
  }
} 
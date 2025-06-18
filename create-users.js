const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createUsers() {
  console.log('Creating users...')
  
  // Create first user
  const { data: user1, error: error1 } = await supabase.auth.admin.createUser({
    email: 'you@example.com',
    password: 'yourpassword',
    email_confirm: true
  })
  
  if (error1) {
    console.error('Error creating first user:', error1)
  } else {
    console.log('✅ Created user:', user1.user.email)
  }
  
  // Create second user
  const { data: user2, error: error2 } = await supabase.auth.admin.createUser({
    email: 'mom@example.com',
    password: 'mompassword',
    email_confirm: true
  })
  
  if (error2) {
    console.error('Error creating second user:', error2)
  } else {
    console.log('✅ Created user:', user2.user.email)
  }
  
  console.log('Done!')
}

createUsers().catch(console.error) 
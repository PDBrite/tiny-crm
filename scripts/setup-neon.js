#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Neon Database Configuration...\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env file...');
  fs.copyFileSync(path.join(process.cwd(), 'env.example'), envPath);
  console.log('✅ .env file created from env.example\n');
} else {
  console.log('✅ .env file already exists\n');
}

console.log('📋 Next steps to complete your Neon setup:\n');

console.log('1. 🌐 Go to https://console.neon.tech and create an account');
console.log('2. 🗄️  Create two projects:');
console.log('   - lead-manager-test (for testing)');
console.log('   - lead-manager-prod (for production)');
console.log('3. 🔗 Get your database connection strings from each project');
console.log('4. 📝 Update your .env file with the following variables:\n');

console.log('   # Test Environment (Neon)');
console.log('   TEST_DATABASE_URL="postgresql://username:password@ep-test-123456.us-east-1.aws.neon.tech/lead_manager_test?sslmode=require"');
console.log('');
console.log('   # Production Environment (Neon)');
console.log('   PRODUCTION_DATABASE_URL="postgresql://username:password@ep-prod-123456.us-east-1.aws.neon.tech/lead_manager_prod?sslmode=require"');
console.log('');

console.log('5. 🗃️  Run the following commands to set up your databases:\n');

console.log('   # For test environment:');
console.log('   npm run db:test:setup');
console.log('');
console.log('   # For production environment:');
console.log('   npm run db:prod:setup');
console.log('');

console.log('6. 🧪 Test your setup:');
console.log('   npm run test');
console.log('');

console.log('📚 For more information, check out:');
console.log('   - Neon Documentation: https://neon.tech/docs');
console.log('   - Prisma with Neon: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploy-to-neon');
console.log('');

console.log('�� Happy coding!'); 
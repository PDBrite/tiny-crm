import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    adminEmail: process.env.ADMIN_EMAIL || 'not set',
    adminPasswordLength: process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.length : 'not set',
    memberEmail: process.env.MEMBER_EMAIL || 'not set',
    memberPasswordLength: process.env.MEMBER_PASSWORD ? process.env.MEMBER_PASSWORD.length : 'not set',
    nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
    nodeEnv: process.env.NODE_ENV || 'not set',
  });
} 
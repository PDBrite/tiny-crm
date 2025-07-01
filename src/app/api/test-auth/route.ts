import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Check admin credentials
    const adminMatch = 
      email === process.env.ADMIN_EMAIL && 
      password === process.env.ADMIN_PASSWORD;
    
    // Check member credentials
    const memberMatch = 
      email === process.env.MEMBER_EMAIL && 
      password === process.env.MEMBER_PASSWORD;
    
    return NextResponse.json({
      success: true,
      adminMatch,
      memberMatch,
      adminEmail: process.env.ADMIN_EMAIL,
      memberEmail: process.env.MEMBER_EMAIL,
      providedEmail: email,
      passwordsMatch: {
        admin: password === process.env.ADMIN_PASSWORD,
        member: password === process.env.MEMBER_PASSWORD
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
} 
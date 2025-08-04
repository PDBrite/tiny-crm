import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Test district contacts API called')
    
    // Get query parameters
    const url = new URL(request.url)
    const districtId = url.searchParams.get('district_id')
    
    // Build query
    const contacts = await prisma.districtContact.findMany({
      where: districtId ? { districtId } : undefined,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        title: true,
        status: true,
        districtId: true
      },
      take: 10
    })

    return NextResponse.json({
      success: true,
      count: contacts.length,
      contacts: contacts
    })
    
  } catch (error) {
    console.error('Error in test district contacts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
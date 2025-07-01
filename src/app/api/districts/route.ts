import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''
    const countyFilter = searchParams.get('county')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const skip = (page - 1) * pageSize

    // Build the where clause based on filters
    let where: any = {}

    // Add search filter if provided
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { county: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    // Add county filter if provided
    if (countyFilter) {
      where.county = countyFilter
    }

    // Count total districts matching the filters
    const totalCount = await prisma.district.count({ where })

    // Get districts from database using Prisma with pagination
    const districts = await prisma.district.findMany({
      where,
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      skip,
      take: pageSize
    })

    // Transform the data to match the expected format
    const transformedDistricts = districts.map(district => ({
      id: district.id,
      name: district.name,
      county: district.county,
      state: district.state,
      type: district.type,
      size: district.size,
      budget: district.budget,
      website: district.website,
      notes: district.notes,
      created_at: district.createdAt,
      updated_at: district.updatedAt,
      contacts_count: district._count.contacts
    }))

    return NextResponse.json({
      districts: transformedDistricts,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    })
  } catch (error) {
    console.error('Error fetching districts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin users can create districts
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, county, state, type, size, budget, website, notes } = body

    // Validate required fields
    if (!name || !county) {
      return NextResponse.json(
        { error: 'Name and county are required' },
        { status: 400 }
      )
    }

    // Create district using Prisma
    const district = await prisma.district.create({
      data: {
        name,
        county,
        state: state || 'California',
        type,
        size: size ? parseInt(size) : null,
        budget: budget ? parseFloat(budget) : null,
        website,
        notes
      }
    })

    return NextResponse.json({ district }, { status: 201 })
  } catch (error) {
    console.error('Error creating district:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
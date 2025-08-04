import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get the district contact ID from the params
    const { id: contactId } = await params

    // Get district contact with all related data
    const contact = await prisma.districtContact.findUnique({
      where: { id: contactId },
      include: {
        district: {
          select: {
            id: true,
            name: true,
            county: true,
            state: true,
            type: true,
            size: true,
            budget: true,
            website: true,
            notes: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true,
            company: true,
            description: true,
            status: true
          }
        },
        touchpoints: {
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'District contact not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user?.role
    const userCompanies = session.user?.allowedCompanies || []
    const canAccessAvalern = 
      userRole === 'admin' || 
      (userRole === 'member' && userCompanies.includes('avalern'))
    
    if (!canAccessAvalern) {
      return NextResponse.json(
        { error: 'Not authorized to access district contacts' },
        { status: 403 }
      )
    }

    // Format the response
    const formattedContact = {
      id: contact.id,
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      status: contact.status,
      notes: contact.notes,
      state: contact.state,
      created_at: contact.createdAt,
      last_contacted_at: contact.lastContactedAt,
      district_lead_id: contact.districtId,
      campaign_id: contact.campaignId,
      district_lead: contact.district ? {
        id: contact.district.id,
        district_name: contact.district.name,
        county: contact.district.county,
        state: contact.district.state,
        type: contact.district.type,
        size: contact.district.size,
        budget: contact.district.budget,
        website: contact.district.website,
        notes: contact.district.notes
      } : null,
      campaign: contact.campaign ? {
        id: contact.campaign.id,
        name: contact.campaign.name,
        company: contact.campaign.company,
        description: contact.campaign.description,
        status: contact.campaign.status
      } : null,
      touchpoints: contact.touchpoints.map(tp => ({
        id: tp.id,
        type: tp.type,
        subject: tp.subject,
        content: tp.content,
        scheduled_at: tp.scheduledAt,
        completed_at: tp.completedAt,
        outcome: tp.outcome,
        outcome_enum: tp.outcomeEnum,
        created_at: tp.createdAt,
        created_by: tp.createdBy ? {
          id: tp.createdBy.id,
          email: tp.createdBy.email,
          name: `${tp.createdBy.firstName || ''} ${tp.createdBy.lastName || ''}`.trim() || tp.createdBy.email
        } : null
      })),
      touchpoints_count: contact.touchpoints.length,
      completed_touchpoints_count: contact.touchpoints.filter(tp => tp.completedAt !== null).length,
      scheduled_touchpoints_count: contact.touchpoints.filter(tp => tp.completedAt === null && tp.scheduledAt !== null).length
    }

    return NextResponse.json(formattedContact)
    
  } catch (error) {
    console.error('Error in district contact API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get the district contact ID from the params
    const { id: contactId } = await params

    // Get the request body
    const body = await request.json()

    // Update the district contact
    const updatedContact = await prisma.districtContact.update({
      where: { id: contactId },
      data: {
        firstName: body.first_name,
        lastName: body.last_name,
        email: body.email,
        phone: body.phone,
        title: body.title,
        status: body.status,
        notes: body.notes,
        lastContactedAt: body.last_contacted_at ? new Date(body.last_contacted_at) : null
      },
      include: {
        district: {
          select: {
            id: true,
            name: true,
            county: true,
            state: true
          }
        }
      }
    })

    // Format the response
    const formattedContact = {
      id: updatedContact.id,
      first_name: updatedContact.firstName,
      last_name: updatedContact.lastName,
      email: updatedContact.email,
      phone: updatedContact.phone,
      title: updatedContact.title,
      status: updatedContact.status,
      notes: updatedContact.notes,
      state: updatedContact.state,
      created_at: updatedContact.createdAt,
      last_contacted_at: updatedContact.lastContactedAt,
      district_lead_id: updatedContact.districtId,
      campaign_id: updatedContact.campaignId,
      district_lead: updatedContact.district ? {
        id: updatedContact.district.id,
        district_name: updatedContact.district.name,
        county: updatedContact.district.county,
        state: updatedContact.district.state
      } : null
    }

    return NextResponse.json(formattedContact)
    
  } catch (error) {
    console.error('Error updating district contact:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get the district contact ID from the params
    const { id: contactId } = await params

    // Check if the contact exists
    const contact = await prisma.districtContact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        districtId: true
      }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'District contact not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user?.role
    const userCompanies = session.user?.allowedCompanies || []
    const canAccessAvalern = 
      userRole === 'admin' || 
      (userRole === 'member' && userCompanies.includes('avalern'))
    
    if (!canAccessAvalern) {
      return NextResponse.json(
        { error: 'Not authorized to delete district contacts' },
        { status: 403 }
      )
    }

    // Delete the district contact
    await prisma.districtContact.delete({
      where: { id: contactId }
    })

    return NextResponse.json({
      message: 'District contact deleted successfully',
      deletedContact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        districtId: contact.districtId
      }
    })
    
  } catch (error) {
    console.error('Error deleting district contact:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { TouchpointType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    const data = await request.json()
    const { touchpoints } = data
    
    if (!Array.isArray(touchpoints) || touchpoints.length === 0) {
      return NextResponse.json(
        { error: 'Invalid touchpoints data. Expected non-empty array.' },
        { status: 400 }
      )
    }

    console.log(`Processing ${touchpoints.length} touchpoints in batch`)
    console.log('Sample touchpoint:', JSON.stringify(touchpoints[0], null, 2))
    
    // Validate touchpoints
    for (const tp of touchpoints) {
      console.log('Validating touchpoint:', { type: tp.type, lead_id: tp.lead_id, district_contact_id: tp.district_contact_id })
      
      if (!tp.type) {
        return NextResponse.json(
          { error: 'Each touchpoint must have a type' },
          { status: 400 }
        )
      }
      
      // Ensure each touchpoint has either a lead_id or district_contact_id
      if (!tp.lead_id && !tp.district_contact_id) {
        return NextResponse.json(
          { error: 'Each touchpoint must have either lead_id or district_contact_id' },
          { status: 400 }
        )
      }
    }
    
    // Process touchpoints in batches
    const BATCH_SIZE = 50;
    let successCount = 0;
    
    for (let i = 0; i < touchpoints.length; i += BATCH_SIZE) {
      const batch = touchpoints.slice(i, i + BATCH_SIZE);
      
      try {
        // Create touchpoints using Prisma
        const mappedData = batch.map(tp => ({
          type: tp.type as TouchpointType,
          subject: tp.subject || null,
          content: tp.content || null,
          scheduledAt: tp.scheduled_at ? new Date(tp.scheduled_at) : new Date(),
          completedAt: tp.completed_at ? new Date(tp.completed_at) : null,
          outcome: tp.outcome || null,
          leadId: tp.lead_id || null,
          districtContactId: tp.district_contact_id || null,
          createdById: userId // Add the creator ID to each touchpoint
        }));
        
        console.log('Mapped touchpoint data sample:', JSON.stringify(mappedData[0], null, 2));
        
        const result = await prisma.touchpoint.createMany({
          data: mappedData
        });
        
        successCount += result.count;
        console.log(`Successfully created batch ${Math.floor(i/BATCH_SIZE) + 1} with ${result.count} touchpoints`);
              } catch (batchError) {
          console.error(`Error processing batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
          throw new Error(`Batch ${Math.floor(i/BATCH_SIZE) + 1} failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
        }
    }
    
    return NextResponse.json({
      success: true,
      count: successCount,
      message: `Successfully created ${successCount} touchpoints`
    })
  } catch (error) {
    console.error('Error creating touchpoints batch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
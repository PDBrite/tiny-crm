import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { CompanyType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyParam = searchParams.get('company')

    // Build where clause
    let where: any = {}
    
    if (companyParam) {
      where.company = companyParam as CompanyType
    }

    // Get sequences with their steps using Prisma
    const sequences = await prisma.outreachSequence.findMany({
      where,
      include: {
        steps: {
          orderBy: {
            stepOrder: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to match the expected format
    const transformedSequences = sequences.map(sequence => ({
      id: sequence.id,
      name: sequence.name,
      company: sequence.company,
      description: sequence.description,
      created_at: sequence.createdAt,
      updated_at: sequence.updatedAt,
      steps: sequence.steps.map(step => ({
        id: step.id,
        sequence_id: step.sequenceId,
        step_order: step.stepOrder,
        type: step.type,
        name: step.name,
        content_link: step.contentLink,
        day_offset: step.dayOffset,
        days_after_previous: step.daysAfterPrevious,
        created_at: step.createdAt,
        updated_at: step.updatedAt
      }))
    }))

    return NextResponse.json(transformedSequences)
  } catch (error) {
    console.error('Error fetching outreach sequences:', error)
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

    const { name, company, description, steps } = await request.json()
    
    if (!name || !company) {
      return NextResponse.json(
        { error: 'Name and company are required' },
        { status: 400 }
      )
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'At least one step is required' },
        { status: 400 }
      )
    }

    // Create the sequence and steps in a transaction
    const completeSequence = await prisma.$transaction(async (tx) => {
      // Create the sequence
      const sequence = await tx.outreachSequence.create({
        data: {
          name,
          company: company as CompanyType,
          description
        }
      })

      // Create the steps
      const stepsData = steps.map((step: any, index: number) => ({
        sequenceId: sequence.id,
        stepOrder: index + 1,
        type: step.type,
        name: step.name,
        contentLink: step.content_link,
        dayOffset: step.day_offset,
        daysAfterPrevious: step.days_after_previous
      }))

      await tx.outreachStep.createMany({
        data: stepsData
      })

      // Fetch the complete sequence with steps
      return await tx.outreachSequence.findUnique({
        where: { id: sequence.id },
        include: {
          steps: {
            orderBy: {
              stepOrder: 'asc'
            }
          }
        }
      })
    })

    if (!completeSequence) {
      return NextResponse.json(
        { error: 'Failed to create outreach sequence' },
        { status: 500 }
      )
    }

    // Transform to match the expected format
    const transformedSequence = {
      id: completeSequence.id,
      name: completeSequence.name,
      company: completeSequence.company,
      description: completeSequence.description,
      created_at: completeSequence.createdAt,
      updated_at: completeSequence.updatedAt,
      steps: completeSequence.steps.map(step => ({
        id: step.id,
        sequence_id: step.sequenceId,
        step_order: step.stepOrder,
        type: step.type,
        name: step.name,
        content_link: step.contentLink,
        day_offset: step.dayOffset,
        days_after_previous: step.daysAfterPrevious,
        created_at: step.createdAt,
        updated_at: step.updatedAt
      }))
    }

    return NextResponse.json(transformedSequence)
  } catch (error) {
    console.error('Error creating outreach sequence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
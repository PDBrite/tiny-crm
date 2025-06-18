import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')

    let query = supabase
      .from('outreach_sequences')
      .select(`
        *,
        steps:outreach_steps(*)
      `)
      .order('created_at', { ascending: false })

    if (company) {
      query = query.eq('company', company)
    }

    const { data: sequences, error } = await query

    if (error) {
      console.error('Error fetching outreach sequences:', error)
      return NextResponse.json(
        { error: 'Failed to fetch outreach sequences' },
        { status: 500 }
      )
    }

    return NextResponse.json(sequences || [])

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

    // Create the sequence
    const { data: sequence, error: sequenceError } = await supabase
      .from('outreach_sequences')
      .insert({
        name,
        company,
        description
      })
      .select()
      .single()

    if (sequenceError) {
      console.error('Error creating outreach sequence:', sequenceError)
      return NextResponse.json(
        { error: 'Failed to create outreach sequence' },
        { status: 500 }
      )
    }

    // Create the steps
    const stepInserts = steps.map((step: any, index: number) => ({
      sequence_id: sequence.id,
      step_order: index + 1,
      type: step.type,
      name: step.name,
      content_link: step.content_link,
      day_offset: step.day_offset
    }))

    const { error: stepsError } = await supabase
      .from('outreach_steps')
      .insert(stepInserts)

    if (stepsError) {
      console.error('Error creating outreach steps:', stepsError)
      // Delete the sequence if steps creation failed
      await supabase.from('outreach_sequences').delete().eq('id', sequence.id)
      return NextResponse.json(
        { error: 'Failed to create outreach steps' },
        { status: 500 }
      )
    }

    // Fetch the complete sequence with steps
    const { data: completeSequence, error: fetchError } = await supabase
      .from('outreach_sequences')
      .select(`
        *,
        steps:outreach_steps(*)
      `)
      .eq('id', sequence.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete sequence:', fetchError)
      return NextResponse.json(
        { error: 'Sequence created but failed to fetch complete data' },
        { status: 500 }
      )
    }

    return NextResponse.json(completeSequence)

  } catch (error) {
    console.error('Error creating outreach sequence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const sb = createServerClient()
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '100')
  const status = searchParams.get('status')
  const source = searchParams.get('source')

  let query = sb.from('companies').select('*').order('created_at', { ascending: false }).limit(limit)
  if (status) query = query.eq('lv_status', status)
  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ companies: data })
}

export async function POST(req: NextRequest) {
  try {
    const sb = createServerClient()
    const body = await req.json()

    if (!body.company_name) return NextResponse.json({ error: 'company_name required' }, { status: 400 })

    const { data, error } = await sb.from('companies').insert({
      ...body,
      source: body.source ?? 'manual',
      lv_status: body.lv_status ?? 'prospect',
      pipeline_status: 'enriched',
    }).select().single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ company: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sb = createServerClient()
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data, error } = await sb.from('companies').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ company: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
  }
}

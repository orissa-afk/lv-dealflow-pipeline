import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Column name aliases — shared with the manual CSV import page
const SPECTER_MAP: Record<string, string> = {
  'company name': 'company_name', 'name': 'company_name',
  'website': 'verified_website', 'url': 'verified_website',
  'description': 'one_liner', 'short description': 'one_liner', 'blurb': 'one_liner',
  'sector': 'sector', 'industry': 'sector', 'category': 'sector',
  'stage': 'stage', 'funding stage': 'stage',
  'founded': 'founding_year', 'founded year': 'founding_year', 'year founded': 'founding_year',
  'raise size': 'raise_amount_raw', 'funding amount': 'raise_amount_raw', 'round size': 'raise_amount_raw',
  'valuation': 'valuation_pre_money_raw',
  'linkedin': 'linkedin_url', 'linkedin url': 'linkedin_url',
  'id': 'specter_id',
}

const BEAUHURST_MAP: Record<string, string> = {
  'company name': 'company_name', 'name': 'company_name',
  'website': 'verified_website',
  'description': 'one_liner', 'about': 'one_liner',
  'sector': 'sector', 'primary sector': 'sector',
  'stage': 'stage', 'deal type': 'stage',
  'founded': 'founding_year', 'incorporation date': 'incorporation_date',
  'latest raise': 'raise_amount_raw', 'amount raised': 'raise_amount_raw',
  'valuation': 'valuation_pre_money_raw', 'post-money valuation': 'valuation_pre_money_raw',
  'company id': 'beauhurst_id', 'beauhurst id': 'beauhurst_id',
  'companies house': 'companies_house_number',
  'employee count': 'linkedin_employee_count',
  'linkedin': 'linkedin_url',
  'hq': 'linkedin_hq', 'location': 'linkedin_hq',
}

function detectSource(keys: string[]): 'specter' | 'beauhurst' {
  const k = keys.map(k => k.toLowerCase())
  if (k.some(k => k.includes('specter') || k === 'id')) return 'specter'
  if (k.some(k => k.includes('beauhurst') || k.includes('companies house') || k.includes('latest raise'))) return 'beauhurst'
  // Fallback: specter has 'raise size', beauhurst has 'amount raised'
  return k.includes('raise size') ? 'specter' : 'beauhurst'
}

function mapRow(row: Record<string, string>, source: 'specter' | 'beauhurst'): Record<string, unknown> {
  const colMap = source === 'specter' ? SPECTER_MAP : BEAUHURST_MAP
  const mapped: Record<string, unknown> = {}

  for (const [col, val] of Object.entries(row)) {
    const norm = col.toLowerCase().trim()
    const field = colMap[norm] ?? norm // pass through if not in map
    if (val?.trim()) {
      if (field === 'founding_year') mapped[field] = parseInt(val) || null
      else if (field === 'linkedin_employee_count') mapped[field] = parseInt(val.replace(/[^0-9]/g, '')) || null
      else mapped[field] = val.trim()
    }
  }

  // Parse raise amounts
  if (mapped.raise_amount_raw) {
    const raw = String(mapped.raise_amount_raw).replace(/[£$,\s]/g, '')
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      const s = String(mapped.raise_amount_raw).toLowerCase()
      const mult = s.includes('m') ? 1_000_000 : s.includes('k') ? 1_000 : 1
      mapped.raise_amount_min = Math.round(num * mult * 0.9)
      mapped.raise_amount_max = Math.round(num * mult * 1.1)
    }
    delete mapped.raise_amount_raw
  }

  // Parse valuation
  if (mapped.valuation_pre_money_raw) {
    const raw = String(mapped.valuation_pre_money_raw).replace(/[£$,\s]/g, '')
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      const s = String(mapped.valuation_pre_money_raw).toLowerCase()
      const mult = s.includes('m') ? 1_000_000 : s.includes('k') ? 1_000 : 1
      mapped.valuation_pre_money = Math.round(num * mult)
    }
    delete mapped.valuation_pre_money_raw
  }

  return mapped
}

// POST /api/zapier — called by Zapier once per Google Sheet row
// Requires header: x-zapier-secret: <ZAPIER_WEBHOOK_SECRET env var>
export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get('x-zapier-secret')
  if (!secret || secret !== process.env.ZAPIER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    // Zapier sends either a single object or {data: {...}}
    const row: Record<string, string> = body.data ?? body

    if (!row || typeof row !== 'object') {
      return NextResponse.json({ error: 'Expected a row object' }, { status: 400 })
    }

    const source = (body.source as 'specter' | 'beauhurst') ?? detectSource(Object.keys(row))
    const mapped = mapRow(row, source)

    const companyName = (mapped.company_name as string | undefined)?.trim()
    if (!companyName) {
      return NextResponse.json({ error: 'company_name is required', received: Object.keys(row) }, { status: 400 })
    }

    const sb = createServerClient()

    let emailDomain: string | null = null
    if (mapped.verified_website) {
      try {
        const url = String(mapped.verified_website)
        const full = url.startsWith('http') ? url : `https://${url}`
        emailDomain = new URL(full).hostname.replace('www.', '')
      } catch { /* ignore */ }
    }

    // Upsert — update enrichment data if company already exists
    const { data, error } = await sb
      .from('companies')
      .upsert({
        company_name: companyName,
        verified_website: (mapped.verified_website as string) ?? null,
        email_domain: emailDomain,
        one_liner: (mapped.one_liner as string) ?? null,
        sector: (mapped.sector as string) ?? null,
        stage: (mapped.stage as string) ?? null,
        founding_year: (mapped.founding_year as number) ?? null,
        raise_amount_min: (mapped.raise_amount_min as number) ?? null,
        raise_amount_max: (mapped.raise_amount_max as number) ?? null,
        valuation_pre_money: (mapped.valuation_pre_money as number) ?? null,
        linkedin_url: (mapped.linkedin_url as string) ?? null,
        linkedin_employee_count: (mapped.linkedin_employee_count as number) ?? null,
        linkedin_hq: (mapped.linkedin_hq as string) ?? null,
        companies_house_number: (mapped.companies_house_number as string) ?? null,
        specter_id: (mapped.specter_id as string) ?? null,
        beauhurst_id: (mapped.beauhurst_id as string) ?? null,
        source,
        lv_status: 'prospect',
        pipeline_status: 'enriched',
        eis_eligible: true,
        uk_registered: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_name',
        ignoreDuplicates: false,
      })
      .select('id, company_name')
      .single()

    if (error) {
      console.error('Zapier import error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      id: data?.id,
      company_name: data?.company_name,
      source,
    })
  } catch (err) {
    console.error('Zapier webhook error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

// GET /api/zapier — Zapier uses this to test the connection
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-zapier-secret')
  if (!secret || secret !== process.env.ZAPIER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, message: 'LV Deal Intelligence webhook is live' })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { source, rows, file_name } = await req.json()

    if (!rows?.length) return NextResponse.json({ error: 'No rows provided' }, { status: 400 })

    const sb = createServerClient()

    // Log the import
    const { data: importLog } = await sb.from('imports').insert({
      import_source: source,
      file_name: file_name ?? 'upload.csv',
      rows_total: rows.length,
      status: 'processing',
    }).select().single()

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        if (!row.company_name?.trim()) { skipped++; continue }

        // Check for existing company by name (case-insensitive)
        const { data: existing } = await sb
          .from('companies')
          .select('id')
          .ilike('company_name', row.company_name.trim())
          .limit(1)
          .single()

        if (existing) { skipped++; continue }

        // Also check by domain if we have it
        if (row.verified_website || row.email_domain) {
          const domain = row.email_domain ?? (row.verified_website ? new URL(row.verified_website.startsWith('http') ? row.verified_website : `https://${row.verified_website}`).hostname.replace('www.', '') : null)
          if (domain) {
            const { data: domainMatch } = await sb.from('companies').select('id').eq('email_domain', domain).limit(1).single()
            if (domainMatch) { skipped++; continue }
          }
        }

        // Derive email_domain from website
        let emailDomain: string | null = null
        if (row.verified_website) {
          try {
            const url = row.verified_website.startsWith('http') ? row.verified_website : `https://${row.verified_website}`
            emailDomain = new URL(url).hostname.replace('www.', '')
          } catch { /* ignore */ }
        }

        await sb.from('companies').insert({
          company_name: row.company_name.trim(),
          verified_website: row.verified_website ?? null,
          email_domain: emailDomain,
          one_liner: row.one_liner ?? null,
          sector: row.sector ?? null,
          stage: row.stage ?? null,
          founding_year: row.founding_year ?? null,
          raise_amount_min: row.raise_amount_min ?? null,
          raise_amount_max: row.raise_amount_max ?? null,
          valuation_pre_money: row.valuation_pre_money ?? null,
          linkedin_url: row.linkedin_url ?? null,
          linkedin_employee_count: row.linkedin_employee_count ?? null,
          linkedin_hq: row.linkedin_hq ?? null,
          companies_house_number: row.companies_house_number ?? null,
          incorporation_date: row.incorporation_date ?? null,
          specter_id: row.specter_id ?? null,
          beauhurst_id: row.beauhurst_id ?? null,
          source,
          lv_status: 'prospect',
          pipeline_status: 'enriched',
          eis_eligible: true,
          uk_registered: true,
        })
        imported++
      } catch (e) {
        errors.push(row.company_name ?? 'unknown')
        skipped++
      }
    }

    // Update import log
    if (importLog) {
      await sb.from('imports').update({
        rows_imported: imported,
        rows_skipped: skipped,
        status: 'complete',
        error_log: errors,
      }).eq('id', importLog.id)
    }

    return NextResponse.json({ imported, skipped, errors })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import failed' }, { status: 500 })
  }
}

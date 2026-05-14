// Affinity CRM REST API helper — called server-side from /api/score
// Auth: Basic auth, empty username, API key as password
// Deals list ID: 137433

const AFFINITY_BASE = 'https://api.affinity.co'
const DEALS_LIST_ID = 137433

function affinityHeaders() {
  const key = process.env.AFFINITY_API_KEY
  if (!key) throw new Error('AFFINITY_API_KEY not set')
  return {
    'Authorization': `Basic ${Buffer.from(`:${key}`).toString('base64')}`,
    'Content-Type': 'application/json',
  }
}

async function affinityFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${AFFINITY_BASE}${path}`, {
    ...options,
    headers: { ...affinityHeaders(), ...(options.headers ?? {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Affinity ${options.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function findOrCreateOrg(name: string, website?: string | null): Promise<number> {
  // Search by name first
  const search = await affinityFetch(`/organizations?term=${encodeURIComponent(name)}&page_size=5`)
  const orgs: Array<{ id: number; name: string }> = search.organizations ?? []

  const match = orgs.find(o => o.name.toLowerCase() === name.toLowerCase())
  if (match) return match.id

  // Create new
  const domainNames: string[] = []
  if (website) {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`
      domainNames.push(new URL(url).hostname.replace('www.', ''))
    } catch { /* ignore */ }
  }

  const created = await affinityFetch('/organizations', {
    method: 'POST',
    body: JSON.stringify({ name, domain_names: domainNames }),
  })
  return created.id
}

async function addToDealsListIfAbsent(orgId: number): Promise<{ alreadyPresent: boolean }> {
  const existing = await affinityFetch(
    `/lists/${DEALS_LIST_ID}/list-entries?organization_id=${orgId}&page_size=1`
  ).catch(() => ({ list_entries: [] }))

  if ((existing.list_entries ?? []).length > 0) {
    return { alreadyPresent: true }
  }

  await affinityFetch(`/lists/${DEALS_LIST_ID}/list-entries`, {
    method: 'POST',
    body: JSON.stringify({ entity_id: orgId }),
  })
  return { alreadyPresent: false }
}

function buildScoreNote(
  companyName: string,
  score: number,
  interpretation: string,
  recommendation: string,
  rationales: Record<string, string>,
  risks: string[],
  questions: string[],
): string {
  const rows = [
    ['Round Quality', rationales.round_quality],
    ['Team Quality', rationales.team_quality],
    ['Problem & Insight', rationales.problem_insight],
    ['BM & Traction', rationales.bm_traction],
    ['GTM & Market', rationales.gtm_market],
    ['Defensibility', rationales.defensibility],
  ].filter(([, v]) => v)

  return `
<strong>LV Deal Score: ${score}/10 — ${interpretation}</strong>
<p>Recommendation: <strong>${recommendation}</strong></p>
<hr>
<strong>Score Breakdown</strong>
<ul>
${rows.map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('\n')}
</ul>
${risks.length ? `<strong>Key Risks</strong><ul>${risks.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
${questions.length ? `<strong>Questions for Founder</strong><ul>${questions.map(q => `<li>${q}</li>`).join('')}</ul>` : ''}
<p><em>Scored by LV Deal Intelligence · ${new Date().toLocaleDateString('en-GB')}</em></p>
`.trim()
}

export interface AffinitySyncPayload {
  companyName: string
  website?: string | null
  score: number
  interpretation: string
  recommendation: string
  rationales: Record<string, string>
  risks: string[]
  questions: string[]
}

export interface AffinitySyncResult {
  orgId: number
  listed: boolean
  noted: boolean
  /** True when the company was already in the Deals list before this score — indicates prior history in Affinity */
  priorHistory: boolean
}

export async function syncToAffinity(payload: AffinitySyncPayload): Promise<AffinitySyncResult> {
  const orgId = await findOrCreateOrg(payload.companyName, payload.website)
  const { alreadyPresent } = await addToDealsListIfAbsent(orgId)

  const noteContent = buildScoreNote(
    payload.companyName,
    payload.score,
    payload.interpretation,
    payload.recommendation,
    payload.rationales,
    payload.risks,
    payload.questions,
  )

  await affinityFetch('/notes', {
    method: 'POST',
    body: JSON.stringify({
      organization_ids: [orgId],
      content: noteContent,
    }),
  })

  return { orgId, listed: true, noted: true, priorHistory: alreadyPresent }
}

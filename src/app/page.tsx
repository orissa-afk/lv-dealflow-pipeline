import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import ScoreBadge from '@/components/ScoreBadge'
import { SourceBadge } from '@/components/StatusBadge'
import type { Company, Score, LvStatus, Source } from '@/lib/types'

export const revalidate = 60 // re-render every 60s

const SCORE_THRESHOLD = 6.5

type DayGroup = {
  dateLabel: string
  dateKey: string
  isToday: boolean
  entries: Array<{ company: Company; score: Score }>
}

async function getDailyFeed(): Promise<{ groups: DayGroup[]; stats: { total: number; todayCount: number; avgScore: string } }> {
  const sb = createServerClient()

  // Get all scores above threshold with their companies, sorted by scored_at desc
  const { data: scores } = await sb
    .from('scores')
    .select('*, companies(*)')
    .gte('lv_final_score', SCORE_THRESHOLD)
    .eq('hard_filter_triggered', false)
    .order('scored_at', { ascending: false })
    .limit(200)

  if (!scores?.length) return { groups: [], stats: { total: 0, todayCount: 0, avgScore: '—' } }

  // Also get total pipeline count for stats
  const { count: total } = await sb.from('companies').select('*', { count: 'exact', head: true }).neq('lv_status', 'passed')

  const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Deduplicate — keep only the most recent score per company
  const seenCompanies = new Set<string>()
  const deduped = scores.filter((s: Score & { companies: Company }) => {
    if (seenCompanies.has(s.company_id)) return false
    seenCompanies.add(s.company_id)
    return true
  })

  // Group by calendar date of scored_at
  const groupMap = new Map<string, Array<{ company: Company; score: Score }>>()

  for (const row of deduped) {
    const company: Company = (row as unknown as { companies: Company }).companies
    if (!company) continue
    const dateKey = (row.scored_at ?? row.created_at ?? new Date().toISOString()).slice(0, 10)
    if (!groupMap.has(dateKey)) groupMap.set(dateKey, [])
    groupMap.get(dateKey)!.push({ company, score: row as Score })
  }

  // Sort each group by score desc
  for (const entries of groupMap.values()) {
    entries.sort((a, b) => (b.score.lv_final_score ?? 0) - (a.score.lv_final_score ?? 0))
  }

  // Convert to sorted array of day groups
  const groups: DayGroup[] = Array.from(groupMap.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // most recent first
    .map(([dateKey, entries]) => {
      const d = new Date(dateKey + 'T12:00:00Z')
      const isToday = dateKey === todayStr
      const isYesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10) === dateKey
      const dateLabel = isToday
        ? 'Today'
        : isYesterday
        ? 'Yesterday'
        : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      return { dateKey, dateLabel, isToday, entries }
    })

  const todayCount = groups.find(g => g.isToday)?.entries.length ?? 0
  const allScores = deduped.map((s: Score) => s.lv_final_score ?? 0)
  const avgScore = allScores.length ? (allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length).toFixed(1) : '—'

  return { groups, stats: { total: total ?? 0, todayCount, avgScore } }
}

export default async function HomePage() {
  const { groups, stats } = await getDailyFeed()

  const todayFull = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main feed */}
      <div className="lg:col-span-2">
        {/* Masthead */}
        <div className="mb-6 pb-4 border-b-2" style={{ borderColor: 'var(--lv-burgundy)' }}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {todayFull}
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-ink)' }}>
            Daily Deal Digest
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            Scored deals above {SCORE_THRESHOLD} · {stats.total} tracked in pipeline
            {stats.todayCount > 0 && <span className="ml-2 font-semibold" style={{ color: 'var(--lv-burgundy)' }}>· {stats.todayCount} added today</span>}
          </p>
        </div>

        {groups.length === 0 && <EmptyState />}

        {groups.map((group) => (
          <section key={group.dateKey} className="mb-10">
            {/* Day header */}
            <div className="flex items-baseline gap-3 mb-4 pb-2 border-b" style={{ borderColor: 'var(--ft-border)' }}>
              <h2
                className="font-bold"
                style={{
                  fontFamily: 'Helvetica Neue, Arial, sans-serif',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: group.isToday ? 'var(--lv-burgundy)' : 'var(--ft-grey)',
                }}
              >
                {group.dateLabel}
              </h2>
              <span className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                {group.entries.length} deal{group.entries.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--ft-border)' }}>
              {group.entries.map((entry, i) => (
                <DigestCard key={entry.company.id} rank={i + 1} company={entry.company} score={entry.score} isToday={group.isToday} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="space-y-6">
        <PipelineStats stats={stats} groups={groups} />
        <ThresholdKey />
        <QuickActions />
      </aside>
    </div>
  )
}

function DigestCard({ rank, company, score, isToday }: {
  rank: number
  company: Company
  score: Score
  isToday: boolean
}) {
  const finalScore = score.lv_final_score ?? 0
  const headline = company.one_liner ?? company.linkedin_description ?? `${company.sector ?? 'Tech'} startup`
  const traction = company.traction_signals

  return (
    <article className="py-4 group">
      <div className="flex gap-4">
        {/* Rank */}
        <div className="flex-shrink-0 w-7 pt-0.5 text-right">
          <span className="text-sm font-bold" style={{ color: 'var(--ft-border)', fontFamily: 'Georgia, serif' }}>{rank}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <ScoreBadge score={finalScore} size="sm" />
            {company.source && <SourceBadge source={company.source as Source} />}
            {score.recommendation && (
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                style={{
                  backgroundColor: score.recommendation === 'Pursue' ? '#E8F5E9' : score.recommendation === 'Conditional' ? '#FFF8E1' : '#FAFAFA',
                  color: score.recommendation === 'Pursue' ? '#2E7D32' : score.recommendation === 'Conditional' ? '#F57C00' : '#9E9E9E',
                  fontFamily: 'Helvetica Neue, Arial, sans-serif',
                  fontSize: '0.6rem',
                }}>
                {score.recommendation}
              </span>
            )}
          </div>

          {/* Company name */}
          <Link href={`/company/${company.id}`} className="hover:underline">
            <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--ft-ink)', fontFamily: 'Georgia, serif' }}>
              {company.company_name}
            </h3>
          </Link>

          {/* Headline */}
          {headline && (
            <p className="text-sm mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'var(--ft-grey)', fontFamily: 'Georgia, serif' }}>
              {headline}
            </p>
          )}

          {/* Traction / key signals */}
          {traction && traction !== headline && (
            <p className="text-xs mt-1.5 italic line-clamp-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
              {traction}
            </p>
          )}

          {/* Key risks — one liner if available */}
          {score.key_risks && Array.isArray(score.key_risks) && (score.key_risks as string[]).length > 0 && (
            <p className="text-xs mt-1" style={{ color: '#B34A00', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
              ⚠ {(score.key_risks as string[])[0]}
            </p>
          )}

          {/* Footer metadata */}
          <div className="flex items-center gap-3 mt-2 flex-wrap" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {company.sector && <span className="text-xs" style={{ color: 'var(--ft-grey)' }}>{company.sector}</span>}
            {company.stage && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: 'var(--ft-grey)' }}>
                {company.stage}
              </span>
            )}
            {company.raise_amount_min && (
              <span className="text-xs" style={{ color: 'var(--ft-grey)' }}>
                £{(company.raise_amount_min / 1_000_000).toFixed(1)}m{company.raise_amount_max ? `–£${(company.raise_amount_max / 1_000_000).toFixed(1)}m` : ''} raise
              </span>
            )}
            <Link href={`/company/${company.id}`} className="text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:underline" style={{ color: 'var(--ft-teal)' }}>
              Full profile →
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function PipelineStats({ stats, groups }: { stats: { total: number; todayCount: number; avgScore: string }; groups: DayGroup[] }) {
  const totalScored = groups.reduce((sum, g) => sum + g.entries.length, 0)
  const topConviction = groups.flatMap(g => g.entries).filter(e => (e.score.lv_final_score ?? 0) >= 8).length

  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--ft-cream-dark)', borderColor: 'var(--ft-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
        Pipeline Stats
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'In Pipeline', value: stats.total },
          { label: 'Avg Score', value: stats.avgScore },
          { label: 'Above Threshold', value: totalScored },
          { label: 'High Conviction', value: topConviction },
          { label: 'Added Today', value: stats.todayCount },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-ink)' }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ThresholdKey() {
  return (
    <div className="rounded-lg p-4 border" style={{ borderColor: 'var(--ft-border)', backgroundColor: 'white' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Score Key</h3>
      <div className="space-y-1.5">
        {[
          { range: '8.0 – 10', label: 'High Conviction', color: '#2E7D32' },
          { range: '7.0 – 7.9', label: 'Proceed to Meeting', color: '#F57C00' },
          { range: '6.5 – 6.9', label: 'Borderline', color: '#B34A00' },
        ].map(({ range, label, color }) => (
          <div key={range} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
              <span className="font-mono">{range}</span> — {label}
            </span>
          </div>
        ))}
        <p className="text-xs mt-2 pt-2 border-t" style={{ borderColor: 'var(--ft-border)', color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          Deals below {SCORE_THRESHOLD} do not appear here. View all on{' '}
          <Link href="/pipeline" className="underline" style={{ color: 'var(--ft-teal)' }}>Pipeline</Link>.
        </p>
      </div>
    </div>
  )
}

function QuickActions() {
  return (
    <div className="rounded-lg p-4 border" style={{ borderColor: 'var(--ft-border)', backgroundColor: 'var(--ft-cream-dark)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Quick Actions</h3>
      <div className="space-y-2">
        {[
          { href: '/pipeline', label: 'Full pipeline' },
          { href: '/import', label: 'Import Specter / Beauhurst' },
          { href: '/comms', label: 'Log a message' },
        ].map(({ href, label }) => (
          <Link key={href} href={href}
            className="block text-sm py-2 px-3 rounded hover:opacity-90 transition-opacity text-center"
            style={{ backgroundColor: 'var(--lv-burgundy)', color: 'white', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 border rounded-lg" style={{ borderColor: 'var(--ft-border)' }}>
      <p className="text-xl mb-2" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-grey)' }}>No scored deals yet</p>
      <p className="text-sm mb-6" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
        Import companies and run the screener skill to see scored deals here
      </p>
      <Link href="/import"
        className="inline-block px-6 py-2 rounded text-white text-sm"
        style={{ backgroundColor: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
        Import Companies
      </Link>
    </div>
  )
}

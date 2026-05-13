import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import ScoreBadge from '@/components/ScoreBadge'
import { StatusBadge, SourceBadge } from '@/components/StatusBadge'
import type { Company, Score, Briefing, NewsItem, LvStatus, Source } from '@/lib/types'

async function getFeedData() {
  const sb = createServerClient()

  const { data: companies } = await sb
    .from('companies')
    .select('*')
    .not('lv_status', 'eq', 'passed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!companies?.length) return { companies: [], scores: {}, briefings: {}, recentNews: [] }

  const ids = companies.map((c: Company) => c.id)

  const [{ data: scores }, { data: briefings }, { data: recentNews }] = await Promise.all([
    sb.from('scores').select('*').in('company_id', ids).order('scored_at', { ascending: false }),
    sb.from('briefings').select('*').in('company_id', ids).order('briefed_at', { ascending: false }),
    sb.from('news_items').select('*').in('company_id', ids).order('news_date', { ascending: false }).limit(30),
  ])

  const scoreMap: Record<string, Score> = {}
  scores?.forEach((s: Score) => { if (!scoreMap[s.company_id]) scoreMap[s.company_id] = s })

  const briefingMap: Record<string, Briefing> = {}
  briefings?.forEach((b: Briefing) => { if (!briefingMap[b.company_id]) briefingMap[b.company_id] = b })

  const sorted = [...companies].sort((a: Company, b: Company) => {
    const sa = scoreMap[a.id]?.lv_final_score ?? -1
    const sb2 = scoreMap[b.id]?.lv_final_score ?? -1
    return sb2 - sa
  })

  return { companies: sorted, scores: scoreMap, briefings: briefingMap, recentNews: recentNews ?? [] }
}

const TODAY = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default async function HomePage() {
  const { companies, scores, briefings, recentNews } = await getFeedData()

  const newsMap: Record<string, NewsItem[]> = {}
  ;(recentNews as NewsItem[]).forEach((n) => {
    if (!newsMap[n.company_id]) newsMap[n.company_id] = []
    newsMap[n.company_id].push(n)
  })

  const topTier = (companies as Company[]).filter((c) => (scores[c.id]?.lv_final_score ?? 0) >= 7)
  const watchlist = (companies as Company[]).filter((c) => {
    const s = scores[c.id]?.lv_final_score ?? 0
    return s < 7 && s >= 5
  })
  const unscored = (companies as Company[]).filter((c) => !scores[c.id])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="mb-6 pb-3 border-b" style={{ borderColor: 'var(--ft-border)' }}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {TODAY}
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-ink)' }}>
            Deal Intelligence
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {(companies as Company[]).length} companies tracked · {topTier.length} above threshold
          </p>
        </div>

        {topTier.length > 0 && (
          <section className="mb-8">
            <SectionHeader label="Priority Pipeline" color="var(--lv-burgundy)" />
            <div className="divide-y" style={{ borderColor: 'var(--ft-border)' }}>
              {topTier.map((company, i) => (
                <FeedCard key={company.id} rank={i + 1} company={company} score={scores[company.id]} briefing={briefings[company.id]} latestNews={newsMap[company.id]?.[0]} />
              ))}
            </div>
          </section>
        )}

        {watchlist.length > 0 && (
          <section className="mb-8">
            <SectionHeader label="Watchlist" color="#F57C00" />
            <div className="divide-y" style={{ borderColor: 'var(--ft-border)' }}>
              {watchlist.map((company, i) => (
                <FeedCard key={company.id} rank={topTier.length + i + 1} company={company} score={scores[company.id]} briefing={briefings[company.id]} latestNews={newsMap[company.id]?.[0]} />
              ))}
            </div>
          </section>
        )}

        {unscored.length > 0 && (
          <section>
            <SectionHeader label="Awaiting Scoring" color="var(--ft-grey)" />
            <div className="divide-y" style={{ borderColor: 'var(--ft-border)' }}>
              {unscored.slice(0, 6).map((company) => (
                <UnscoredRow key={company.id} company={company} />
              ))}
            </div>
          </section>
        )}

        {(companies as Company[]).length === 0 && <EmptyState />}
      </div>

      <aside className="space-y-6">
        <QuickStats companies={companies as Company[]} scores={scores} />
        <RecentNews recentNews={recentNews as NewsItem[]} companies={companies as Company[]} />
        <QuickActions />
      </aside>
    </div>
  )
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color, fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{label}</h2>
    </div>
  )
}

function FeedCard({ rank, company, score, briefing, latestNews }: {
  rank: number; company: Company; score?: Score; briefing?: Briefing; latestNews?: NewsItem
}) {
  const finalScore = score?.lv_final_score
  const headline = briefing?.headline ?? company.one_liner ?? company.linkedin_description ?? `${company.company_name} — ${company.sector ?? 'Tech'}`
  const standfirst = briefing?.standfirst ?? company.traction_signals ?? ''

  return (
    <article className="py-4">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-8 text-center pt-1">
          <span className="text-2xl font-bold" style={{ color: 'var(--ft-border)', fontFamily: 'Georgia, serif' }}>{rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {finalScore != null && <ScoreBadge score={finalScore} size="sm" />}
            {company.lv_status && <StatusBadge status={company.lv_status as LvStatus} />}
            {company.source && <SourceBadge source={company.source as Source} />}
          </div>
          <Link href={`/company/${company.id}`} className="hover:underline">
            <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--ft-ink)', fontFamily: 'Georgia, serif' }}>
              {company.company_name}
            </h3>
          </Link>
          {headline && (
            <p className="text-sm mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'var(--ft-grey)', fontFamily: 'Georgia, serif' }}>
              {headline}
            </p>
          )}
          {standfirst && standfirst !== headline && (
            <p className="text-xs mt-1 leading-relaxed line-clamp-2 italic" style={{ color: 'var(--ft-grey)' }}>{standfirst}</p>
          )}
          {latestNews && (
            <div className="mt-2 flex items-start gap-1.5">
              <span className="text-xs font-bold uppercase shrink-0" style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>News</span>
              <span className="text-xs leading-snug" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{latestNews.headline}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {company.sector && <span className="text-xs" style={{ color: 'var(--ft-grey)' }}>{company.sector}</span>}
            {company.stage && <span className="text-xs" style={{ color: 'var(--ft-grey)' }}>{company.stage}</span>}
            {company.founding_year && <span className="text-xs" style={{ color: 'var(--ft-grey)' }}>Est. {company.founding_year}</span>}
            <Link href={`/company/${company.id}`} className="text-xs ml-auto hover:underline" style={{ color: 'var(--ft-teal)' }}>Full profile →</Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function UnscoredRow({ company }: { company: Company }) {
  return (
    <div className="py-3 flex items-center gap-3 flex-wrap">
      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Unscored</span>
      <Link href={`/company/${company.id}`} className="text-sm hover:underline flex-1" style={{ color: 'var(--ft-ink)', fontFamily: 'Georgia, serif' }}>{company.company_name}</Link>
      {company.sector && <span className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{company.sector}</span>}
      <Link href={`/company/${company.id}`} className="text-xs hover:underline" style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Score →</Link>
    </div>
  )
}

function QuickStats({ companies, scores }: { companies: Company[]; scores: Record<string, Score> }) {
  const statusCount: Record<string, number> = {}
  companies.forEach((c) => { const s = c.lv_status ?? 'prospect'; statusCount[s] = (statusCount[s] ?? 0) + 1 })
  const scored = companies.filter((c) => scores[c.id]?.lv_final_score != null)
  const avgScore = scored.length ? (scored.reduce((sum, c) => sum + (scores[c.id]?.lv_final_score ?? 0), 0) / scored.length).toFixed(1) : '—'

  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--ft-cream-dark)', borderColor: 'var(--ft-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Pipeline Stats</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total', value: companies.length },
          { label: 'Avg Score', value: avgScore },
          { label: 'Met', value: statusCount['met'] ?? 0 },
          { label: 'Due Diligence', value: statusCount['due_diligence'] ?? 0 },
          { label: 'Invested', value: statusCount['invested'] ?? 0 },
          { label: 'Watching', value: statusCount['watching'] ?? 0 },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentNews({ recentNews, companies }: { recentNews: NewsItem[]; companies: Company[] }) {
  if (!recentNews.length) return null
  const nameMap: Record<string, string> = {}
  companies.forEach((c) => { nameMap[c.id] = c.company_name })

  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: 'var(--ft-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Latest News</h3>
      <div className="space-y-3">
        {recentNews.slice(0, 5).map((n) => (
          <div key={n.id} className="border-b last:border-0 pb-3 last:pb-0" style={{ borderColor: 'var(--ft-border)' }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{nameMap[n.company_id] ?? n.company_name}</p>
            <p className="text-xs leading-snug" style={{ fontFamily: 'Georgia, serif' }}>{n.headline}</p>
            {(n.news_date ?? n.source) && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                {n.news_date ? new Date(n.news_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                {n.source && ` · ${n.source}`}
              </p>
            )}
          </div>
        ))}
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
          { href: '/import', label: 'Import Specter / Beauhurst CSV' },
          { href: '/comms', label: 'Log WhatsApp / LinkedIn message' },
          { href: '/pipeline', label: 'View full pipeline' },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="block text-sm py-2 px-3 rounded hover:opacity-90 transition-opacity text-center"
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
    <div className="text-center py-16">
      <p className="text-xl mb-2" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-grey)' }}>No deals tracked yet</p>
      <p className="text-sm mb-6" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>Import a Specter or Beauhurst CSV to get started</p>
      <Link href="/import" className="inline-block px-6 py-2 rounded text-white text-sm"
        style={{ backgroundColor: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
        Import Companies
      </Link>
    </div>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
const supabase = createSupabaseBrowserClient()
import ScoreBadge from '@/components/ScoreBadge'
import { StatusBadge, SourceBadge } from '@/components/StatusBadge'
import type { Company, Score, LvStatus, Source } from '@/lib/types'
import { LV_STATUS_LABELS } from '@/lib/types'

const SECTORS = ['All', 'Fintech', 'Applied AI', 'B2B SaaS', 'PropTech', 'HealthTech', 'LegalTech', 'InsurTech', 'Consumer Tech', 'Future of Work', 'Infrastructure', 'Other']
const STATUSES: Array<LvStatus | 'all'> = ['all', 'prospect', 'outreach_sent', 'meeting_requested', 'met', 'due_diligence', 'term_sheet', 'invested', 'passed', 'watching']
const SOURCES: Array<Source | 'all'> = ['all', 'inbound', 'specter', 'beauhurst', 'sifted', 'linkedin', 'manual']

export default function PipelinePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<LvStatus | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<Source | 'all'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'date' | 'status'>('score')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: cos } = await supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(200)
    if (!cos?.length) { setLoading(false); return }
    const ids = cos.map((c: Company) => c.id)
    const { data: sc } = await supabase.from('scores').select('*').in('company_id', ids)
    const scoreMap: Record<string, Score> = {}
    sc?.forEach((s: Score) => { if (!scoreMap[s.company_id]) scoreMap[s.company_id] = s })
    setCompanies(cos)
    setScores(scoreMap)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = companies
    .filter((c) => {
      if (search && !c.company_name.toLowerCase().includes(search.toLowerCase()) && !(c.sector ?? '').toLowerCase().includes(search.toLowerCase())) return false
      if (sectorFilter !== 'All' && !(c.sector ?? '').toLowerCase().includes(sectorFilter.toLowerCase())) return false
      if (statusFilter !== 'all' && c.lv_status !== statusFilter) return false
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (scores[b.id]?.lv_final_score ?? -1) - (scores[a.id]?.lv_final_score ?? -1)
      if (sortBy === 'name') return a.company_name.localeCompare(b.company_name)
      if (sortBy === 'date') return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      return 0
    })

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Pipeline</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {filtered.length} of {companies.length} companies
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/import" className="text-sm px-3 py-1.5 rounded text-white"
            style={{ backgroundColor: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            Import CSV
          </Link>
          <Link href="/comms" className="text-sm px-3 py-1.5 rounded border"
            style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-ink)' }}>
            Add Comms
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-4 rounded-lg border space-y-3" style={{ backgroundColor: 'white', borderColor: 'var(--ft-border)' }}>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 text-sm px-3 py-1.5 rounded border"
            style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', backgroundColor: 'var(--ft-cream)' }}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm px-3 py-1.5 rounded border"
            style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', backgroundColor: 'var(--ft-cream)' }}>
            <option value="score">Sort: Score</option>
            <option value="date">Sort: Newest</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FilterSelect label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as LvStatus | 'all')}
            options={STATUSES.map((s) => ({ value: s, label: s === 'all' ? 'All Statuses' : LV_STATUS_LABELS[s as LvStatus] }))} />
          <FilterSelect label="Source" value={sourceFilter} onChange={(v) => setSourceFilter(v as Source | 'all')}
            options={SOURCES.map((s) => ({ value: s, label: s === 'all' ? 'All Sources' : s.charAt(0).toUpperCase() + s.slice(1) }))} />
          <div className="flex gap-1 flex-wrap">
            {SECTORS.map((s) => (
              <button key={s} onClick={() => setSectorFilter(s)}
                className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                style={{
                  backgroundColor: sectorFilter === s ? 'var(--lv-burgundy)' : 'white',
                  color: sectorFilter === s ? 'white' : 'var(--ft-grey)',
                  borderColor: sectorFilter === s ? 'var(--lv-burgundy)' : 'var(--ft-border)',
                  fontFamily: 'Helvetica Neue, Arial, sans-serif',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--ft-grey)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--ft-grey)' }}>No companies match your filters.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--ft-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--ft-cream-dark)', borderBottom: '1px solid var(--ft-border)' }}>
                {['Company', 'Sector', 'Stage', 'Score', 'Status', 'Source', 'Founded', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((company, i) => {
                const score = scores[company.id]
                return (
                  <tr key={company.id}
                    className="border-b hover:opacity-90 transition-opacity"
                    style={{ borderColor: 'var(--ft-border)', backgroundColor: i % 2 === 0 ? 'white' : 'var(--ft-cream)' }}>
                    <td className="px-4 py-3">
                      <Link href={`/company/${company.id}`} className="font-medium hover:underline"
                        style={{ color: 'var(--ft-ink)', fontFamily: 'Georgia, serif' }}>
                        {company.company_name}
                      </Link>
                      {company.one_liner && (
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                          {company.one_liner}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                      {company.sector ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                      {company.stage ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={score?.lv_final_score} size="sm" showLabel={false} />
                    </td>
                    <td className="px-4 py-3">
                      {company.lv_status && <StatusBadge status={company.lv_status as LvStatus} />}
                    </td>
                    <td className="px-4 py-3">
                      {company.source && <SourceBadge source={company.source as Source} />}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                      {company.founding_year ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/company/${company.id}`} className="text-xs hover:underline"
                        style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>View →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="text-xs px-3 py-1.5 rounded border"
      style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', backgroundColor: 'var(--ft-cream)' }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

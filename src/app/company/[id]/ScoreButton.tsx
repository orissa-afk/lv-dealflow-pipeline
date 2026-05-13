'use client'
import { useState } from 'react'
import type { Company } from '@/lib/types'

export default function ScoreButton({ companyId, company }: { companyId: string; company: Company }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleScore() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          company_name: company.company_name,
          one_liner: company.one_liner,
          sector: company.sector,
          stage: company.stage,
          founding_year: company.founding_year,
          founders: company.founders,
          traction: company.traction_signals,
          business_model: company.business_model,
          market_summary: company.market_summary,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setDone(true)
      setTimeout(() => window.location.reload(), 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleScore}
        disabled={loading}
        className="text-sm px-4 py-2 rounded text-white disabled:opacity-50 w-full"
        style={{ backgroundColor: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
      >
        {loading ? 'Scoring...' : done ? 'Scored ✓' : 'Score with AI'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

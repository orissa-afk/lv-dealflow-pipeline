'use client'
import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
const supabase = createSupabaseBrowserClient()
import type { Company, InteractionType } from '@/lib/types'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function CommsForm() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('company_id')

  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState(preselectedId ?? '')
  const [type, setType] = useState<InteractionType>('whatsapp')
  const [direction, setDirection] = useState<'inbound' | 'outbound' | 'internal'>('inbound')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [interactionDate, setInteractionDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [aiSummary, setAiSummary] = useState('')
  const [aiSentiment, setAiSentiment] = useState('')
  const [summarizing, setSummarizing] = useState(false)

  useEffect(() => {
    supabase.from('companies').select('id, company_name').order('company_name').limit(200).then(({ data }) => {
      if (data) setCompanies(data as Company[])
    })
  }, [])

  async function handleSummarise() {
    if (!content.trim()) return
    setSummarizing(true)
    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarise', content }),
      })
      const data = await res.json()
      if (data.summary) setAiSummary(data.summary)
      if (data.sentiment) setAiSentiment(data.sentiment)
    } finally {
      setSummarizing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId || !content.trim()) { setError('Company and message content are required'); return }
    setSubmitting(true)
    setError('')

    const company = companies.find((c) => c.id === companyId)

    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          company_id: companyId,
          company_name: company?.company_name,
          type,
          direction,
          contact_name: contactName || null,
          contact_email: contactEmail || null,
          subject: subject || null,
          content,
          summary: aiSummary || null,
          sentiment: aiSentiment || null,
          interaction_date: interactionDate,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setDone(true)
      setContent('')
      setAiSummary('')
      setAiSentiment('')
      setSubject('')
      setContactName('')
      setContactEmail('')
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const TYPE_ICONS: Record<InteractionType, string> = {
    email: '✉️', linkedin: '💼', whatsapp: '💬', call: '📞', meeting: '🤝', note: '📝'
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Log Communication</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          Paste a WhatsApp conversation, LinkedIn message, email thread, or add a call/meeting note. AI will extract a summary and sentiment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Company */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
            Company *
          </label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required
            className="w-full text-sm px-3 py-2 rounded border"
            style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', backgroundColor: 'var(--ft-cream)' }}>
            <option value="">Select company...</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>

        {/* Type + Direction */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
              Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['email', 'linkedin', 'whatsapp', 'call', 'meeting', 'note'] as InteractionType[]).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: type === t ? 'var(--lv-burgundy)' : 'white',
                    color: type === t ? 'white' : 'var(--ft-ink)',
                    borderColor: type === t ? 'var(--lv-burgundy)' : 'var(--ft-border)',
                    fontFamily: 'Helvetica Neue, Arial, sans-serif',
                  }}>
                  {TYPE_ICONS[t]} {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
              Direction
            </label>
            <div className="flex gap-2">
              {(['inbound', 'outbound', 'internal'] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDirection(d)}
                  className="text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize"
                  style={{
                    backgroundColor: direction === d ? 'var(--ft-teal)' : 'white',
                    color: direction === d ? 'white' : 'var(--ft-ink)',
                    borderColor: direction === d ? 'var(--ft-teal)' : 'var(--ft-border)',
                    fontFamily: 'Helvetica Neue, Arial, sans-serif',
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
              Contact Name
            </label>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Jane Smith"
              className="w-full text-sm px-3 py-2 rounded border"
              style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', backgroundColor: 'var(--ft-cream)' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
              Date
            </label>
            <input type="date" value={interactionDate} onChange={(e) => setInteractionDate(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded border"
              style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', backgroundColor: 'var(--ft-cream)' }} />
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
            Subject / Topic
          </label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Follow up after intro call"
            className="w-full text-sm px-3 py-2 rounded border"
            style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', backgroundColor: 'var(--ft-cream)' }} />
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
              Message / Conversation *
            </label>
            <button type="button" onClick={handleSummarise} disabled={!content.trim() || summarizing}
              className="text-xs px-3 py-1 rounded border disabled:opacity-40"
              style={{ borderColor: 'var(--ft-teal)', color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
              {summarizing ? 'Summarising...' : 'AI Summarise'}
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Paste the full WhatsApp conversation, email, or LinkedIn message here..."
            className="w-full text-sm px-3 py-2 rounded border resize-y"
            style={{ borderColor: 'var(--ft-border)', fontFamily: 'Georgia, serif', backgroundColor: 'white', lineHeight: '1.6' }}
          />
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div className="p-4 rounded-lg border" style={{ backgroundColor: '#F0FDF4', borderColor: '#6EE7B7' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#065F46', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                AI Summary
                {aiSentiment && <span className="ml-2 font-normal capitalize">· {aiSentiment}</span>}
              </span>
              <button type="button" onClick={() => { setAiSummary(''); setAiSentiment('') }}
                className="text-xs" style={{ color: '#6B7280', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                Clear
              </button>
            </div>
            <textarea
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              rows={3}
              className="w-full text-sm px-0 bg-transparent border-0 resize-none focus:outline-none"
              style={{ fontFamily: 'Georgia, serif', color: '#065F46' }}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{error}</p>}
        {done && <p className="text-sm text-green-700" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>✅ Communication logged successfully.</p>}

        <button type="submit" disabled={submitting}
          className="w-full py-3 rounded text-white font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          {submitting ? 'Saving...' : 'Save Communication'}
        </button>
      </form>
    </div>
  )
}

export default function CommsPage() {
  return (
    <Suspense fallback={<div className="text-sm" style={{ color: 'var(--ft-grey)' }}>Loading...</div>}>
      <CommsForm />
    </Suspense>
  )
}

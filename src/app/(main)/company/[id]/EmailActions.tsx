'use client'
import { useState } from 'react'
import type { Company, Score, FounderJson } from '@/lib/types'

const LV_FROM = 'orissa@loveventures.co.uk'

function passEmail(company: Company): { to: string; subject: string; body: string } {
  const founderEmail = Array.isArray(company.founders) && company.founders[0]
    ? ((company.founders[0] as unknown) as FounderJson).email ?? ''
    : ''
  return {
    to: founderEmail,
    subject: `Re: ${company.company_name}`,
    body: `Hi,

Thank you for reaching out about ${company.company_name} — we really appreciated you taking the time to share what you're building.

After careful consideration, we've decided not to move forward at this stage. This reflects our current portfolio priorities rather than any reflection on your team or the opportunity itself.

We'll keep ${company.company_name} on our radar and would love to stay in touch as you continue to build.

Wishing you the very best,
Orissa
Love Ventures`,
  }
}

function engageEmail(company: Company, score?: Score): { to: string; subject: string; body: string } {
  const founderEmail = Array.isArray(company.founders) && company.founders[0]
    ? ((company.founders[0] as unknown) as FounderJson).email ?? ''
    : ''
  const scoreStr = score?.lv_final_score != null ? ` (internal score: ${score.lv_final_score}/10)` : ''
  return {
    to: founderEmail,
    subject: `Love Ventures × ${company.company_name} — Next Steps`,
    body: `Hi,

Thank you for sharing ${company.company_name} with us — we've had a good look and are excited by what you're building.

We'd love to schedule a call to learn more. Could you send over a few times that work for you this week or next?

Looking forward to it,
Orissa
Love Ventures`,
  }
}

function gmailComposeUrl(to: string, subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function EmailActions({ company, score }: { company: Company; score?: Score }) {
  const [open, setOpen] = useState<'pass' | 'engage' | null>(null)
  const [copied, setCopied] = useState(false)

  const template = open === 'pass' ? passEmail(company) : open === 'engage' ? engageEmail(company, score) : null

  function copy() {
    if (!template) return
    navigator.clipboard.writeText(template.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setOpen('engage')}
          className="flex-1 text-sm px-3 py-2 rounded border font-medium hover:opacity-90 transition-opacity"
          style={{ borderColor: 'var(--ft-teal)', color: 'var(--ft-teal)', backgroundColor: 'white', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
        >
          Reach Out
        </button>
        <button
          onClick={() => setOpen('pass')}
          className="flex-1 text-sm px-3 py-2 rounded border hover:opacity-90 transition-opacity"
          style={{ borderColor: 'var(--ft-border)', color: 'var(--ft-grey)', backgroundColor: 'white', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
        >
          Send Pass
        </button>
      </div>

      {/* Modal */}
      {open && template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ft-border)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--ft-ink)' }}>
                {open === 'engage' ? 'Reach Out Email' : 'Pass Email'} — {company.company_name}
              </h3>
              <button onClick={() => setOpen(null)} className="text-lg leading-none" style={{ color: 'var(--ft-grey)' }}>✕</button>
            </div>

            {/* Fields */}
            <div className="px-5 py-4 space-y-3 text-sm">
              <div>
                <label className="text-xs uppercase tracking-wide font-bold" style={{ color: 'var(--ft-grey)' }}>To</label>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--ft-ink)' }}>{template.to || <span style={{ color: 'var(--ft-grey)' }}>No email on file — add manually</span>}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide font-bold" style={{ color: 'var(--ft-grey)' }}>Subject</label>
                <p className="mt-0.5" style={{ color: 'var(--ft-ink)' }}>{template.subject}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide font-bold block mb-1" style={{ color: 'var(--ft-grey)' }}>Body</label>
                <textarea
                  className="w-full text-sm rounded border p-3 resize-none focus:outline-none"
                  style={{ borderColor: 'var(--ft-border)', color: 'var(--ft-ink)', minHeight: '180px', backgroundColor: 'var(--ft-cream)' }}
                  defaultValue={template.body}
                  onChange={(e) => {
                    // allow editing — tracked in the textarea itself
                    ;(e.target as HTMLTextAreaElement).dataset.edited = e.target.value
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--ft-border)' }}>
              <a
                href={gmailComposeUrl(template.to, template.subject, template.body)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-sm py-2 px-4 rounded text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--lv-burgundy)' }}
              >
                Open in Gmail ↗
              </a>
              <button
                onClick={copy}
                className="text-sm py-2 px-4 rounded border hover:opacity-90 transition-opacity"
                style={{ borderColor: 'var(--ft-border)', color: 'var(--ft-grey)' }}
              >
                {copied ? 'Copied ✓' : 'Copy body'}
              </button>
              <button
                onClick={() => setOpen(null)}
                className="text-sm py-2 px-3 rounded border hover:opacity-90 transition-opacity"
                style={{ borderColor: 'var(--ft-border)', color: 'var(--ft-grey)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

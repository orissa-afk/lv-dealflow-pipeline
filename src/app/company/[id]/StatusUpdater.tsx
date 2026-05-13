'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { LvStatus } from '@/lib/types'
import { LV_STATUS_LABELS } from '@/lib/types'

const STATUSES: LvStatus[] = ['prospect', 'outreach_sent', 'meeting_requested', 'met', 'due_diligence', 'term_sheet', 'invested', 'passed', 'watching']

export default function StatusUpdater({ companyId, currentStatus }: { companyId: string; currentStatus: LvStatus }) {
  const [status, setStatus] = useState<LvStatus>(currentStatus ?? 'prospect')
  const [saving, setSaving] = useState(false)

  async function handleChange(newStatus: LvStatus) {
    setSaving(true)
    setStatus(newStatus)
    await supabase.from('companies').update({ lv_status: newStatus }).eq('id', companyId)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as LvStatus)}
        disabled={saving}
        className="text-xs px-3 py-1.5 rounded border w-full"
        style={{ borderColor: 'var(--ft-border)', fontFamily: 'Helvetica Neue, Arial, sans-serif', backgroundColor: 'var(--ft-cream)' }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{LV_STATUS_LABELS[s]}</option>
        ))}
      </select>
      {saving && <span className="text-xs" style={{ color: 'var(--ft-grey)' }}>Saving...</span>}
    </div>
  )
}

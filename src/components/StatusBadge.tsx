import { LvStatus, LV_STATUS_LABELS, Source, SOURCE_LABELS } from '@/lib/types'

const STATUS_STYLES: Record<LvStatus, { bg: string; text: string }> = {
  prospect:          { bg: '#F3F4F6', text: '#374151' },
  outreach_sent:     { bg: '#EFF6FF', text: '#1E40AF' },
  meeting_requested: { bg: '#FEF3C7', text: '#92400E' },
  met:               { bg: '#ECFDF5', text: '#065F46' },
  due_diligence:     { bg: '#F5F3FF', text: '#4C1D95' },
  term_sheet:        { bg: '#FFF7ED', text: '#9A3412' },
  invested:          { bg: '#ECFDF5', text: '#14532D' },
  passed:            { bg: '#FEF2F2', text: '#991B1B' },
  watching:          { bg: '#F0FDF4', text: '#166534' },
}

const SOURCE_STYLES: Record<Source, { bg: string; text: string }> = {
  inbound:    { bg: '#EFF6FF', text: '#1E40AF' },
  specter:    { bg: '#F5F3FF', text: '#4C1D95' },
  beauhurst:  { bg: '#FFF7ED', text: '#9A3412' },
  sifted:     { bg: '#F0FDF4', text: '#166534' },
  linkedin:   { bg: '#EFF6FF', text: '#1D4ED8' },
  manual:     { bg: '#F9FAFB', text: '#374151' },
}

export function StatusBadge({ status }: { status: LvStatus }) {
  const style = STATUS_STYLES[status] ?? { bg: '#F3F4F6', text: '#374151' }
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: style.bg, color: style.text, fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
    >
      {LV_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function SourceBadge({ source }: { source: Source }) {
  const style = SOURCE_STYLES[source] ?? { bg: '#F9FAFB', text: '#374151' }
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: style.bg, color: style.text, fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  )
}

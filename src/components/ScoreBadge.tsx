import { interpretScore } from '@/lib/types'

interface Props {
  score: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

function scoreColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 9) return { bg: '#E8F5E9', text: '#1B5E20', border: '#00703C' }
  if (score >= 8) return { bg: '#F1F8E9', text: '#2E7D32', border: '#558B2F' }
  if (score >= 7) return { bg: '#FFF8E1', text: '#E65100', border: '#F57C00' }
  if (score >= 6) return { bg: '#FFF3E0', text: '#BF360C', border: '#E64A19' }
  if (score >= 4) return { bg: '#FFEBEE', text: '#B71C1C', border: '#C62828' }
  return { bg: '#FCE4EC', text: '#880E4F', border: '#AD1457' }
}

export default function ScoreBadge({ score, size = 'md', showLabel = true }: Props) {
  if (score == null) return <span className="text-gray-400 text-sm italic">Unscored</span>

  const { bg, text, border } = scoreColor(score)
  const label = interpretScore(score)

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5 font-semibold',
  }[size]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses}`}
      style={{ backgroundColor: bg, color: text, borderColor: border }}
    >
      <span className="font-bold tabular-nums">{score.toFixed(1)}</span>
      {showLabel && <span className="opacity-75">·</span>}
      {showLabel && <span>{label}</span>}
    </span>
  )
}

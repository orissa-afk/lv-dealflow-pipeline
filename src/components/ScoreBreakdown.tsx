'use client'
import type { Score } from '@/lib/types'

interface Props { score: Score }

const CATEGORIES = [
  { key: 'team_quality_score',     label: 'Team Quality',      weight: 25, rationale: 'team_quality_rationale' },
  { key: 'round_quality_score',    label: 'Round Quality',     weight: 20, rationale: 'round_quality_rationale' },
  { key: 'problem_insight_score',  label: 'Problem & Insight', weight: 15, rationale: 'problem_insight_rationale' },
  { key: 'bm_traction_score',      label: 'BM & Traction',     weight: 15, rationale: 'bm_traction_rationale' },
  { key: 'gtm_market_score',       label: 'GTM & Market',      weight: 15, rationale: 'gtm_market_rationale' },
  { key: 'defensibility_score',    label: 'Defensibility',     weight: 10, rationale: 'defensibility_rationale' },
  { key: 'sector_fit_score',       label: 'Sector Fit',        weight: 0,  rationale: 'sector_fit_rationale' },
] as const

function barColor(v: number) {
  if (v >= 8) return '#00703C'
  if (v >= 7) return '#2E7D32'
  if (v >= 6) return '#F57C00'
  if (v >= 4) return '#E65100'
  return '#C62828'
}

export default function ScoreBreakdown({ score }: Props) {
  const penalties = (score.penalties_detail ?? []) as Array<{ reason: string; points: number }>
  const bonus = score.bonus_applied ?? 0

  return (
    <div className="space-y-3">
      {CATEGORIES.map(({ key, label, weight, rationale }) => {
        const val = score[key as keyof Score] as number | undefined
        if (val == null) return null
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                {label}
                {weight > 0 && <span className="text-xs text-gray-400 ml-1">({weight}%)</span>}
              </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: barColor(val) }}>{val}/10</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${val * 10}%`, backgroundColor: barColor(val) }}
              />
            </div>
            {score[rationale as keyof Score] && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                {score[rationale as keyof Score] as string}
              </p>
            )}
          </div>
        )
      })}

      {(penalties.length > 0 || bonus > 0) && (
        <div className="border-t pt-3 space-y-1" style={{ borderColor: 'var(--ft-border)' }}>
          {penalties.map((p, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-red-600" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                − {p.reason}
              </span>
              <span className="font-bold text-red-600">-{p.points}</span>
            </div>
          ))}
          {bonus > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-700" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>+ Bonus</span>
              <span className="font-bold text-green-700">+{bonus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

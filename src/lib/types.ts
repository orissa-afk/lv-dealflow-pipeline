export type LvStatus =
  | 'prospect'
  | 'outreach_sent'
  | 'meeting_requested'
  | 'met'
  | 'due_diligence'
  | 'term_sheet'
  | 'invested'
  | 'passed'
  | 'watching'

export type PipelineStatus = 'enriched' | 'scored' | 'briefed' | 'passed'
export type Source = 'inbound' | 'specter' | 'beauhurst' | 'sifted' | 'linkedin' | 'manual'
export type InteractionType = 'email' | 'linkedin' | 'whatsapp' | 'call' | 'meeting' | 'note'
export type Direction = 'inbound' | 'outbound' | 'internal'
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed'
export type Recommendation = 'Pursue' | 'Conditional' | 'Pass'
export type ScoringSource = 'ai' | 'manual' | 'ai_with_override'

export interface Company {
  id: string
  company_name: string
  verified_website?: string
  email_domain?: string
  uk_registered?: boolean
  business_model?: string
  sector?: string
  stage?: string
  founding_year?: number
  founders?: FounderJson[]
  one_liner?: string
  raise_amount_min?: number
  raise_amount_max?: number
  valuation_pre_money?: number
  eis_eligible?: boolean
  lv_status?: LvStatus
  pipeline_status?: PipelineStatus
  source?: Source
  tech_category?: string
  news_summary?: string
  last_news_at?: string
  traction_signals?: string
  market_summary?: string
  linkedin_url?: string
  linkedin_employee_count?: number
  linkedin_description?: string
  companies_house_number?: string
  incorporation_date?: string
  daily_rank?: number
  specter_id?: string
  beauhurst_id?: string
  enriched_at?: string
  scored_at?: string
  briefed_at?: string
  created_at?: string
  updated_at?: string
}

export interface FounderJson {
  name: string
  title?: string
  linkedin?: string
  email?: string
  background?: string
}

export interface Score {
  id: string
  company_id: string
  company_name?: string
  // LV PDF framework (6 categories)
  sector_fit_score?: number
  round_quality_score?: number
  team_quality_score?: number
  problem_insight_score?: number
  bm_traction_score?: number
  gtm_market_score?: number
  defensibility_score?: number
  penalties_total?: number
  bonus_applied?: number
  lv_final_score?: number
  score_interpretation?: string
  hard_filter_details?: Record<string, unknown>
  penalties_detail?: PenaltyItem[]
  // Rationales
  sector_fit_rationale?: string
  round_quality_rationale?: string
  team_quality_rationale?: string
  problem_insight_rationale?: string
  bm_traction_rationale?: string
  gtm_market_rationale?: string
  defensibility_rationale?: string
  // Legacy fields (inbound email pipeline)
  hard_filter_triggered?: boolean
  hard_filter_reason?: string
  recommendation?: Recommendation
  key_risks?: string[]
  key_questions?: string[]
  eis_status?: string
  scoring_source?: ScoringSource
  scored_at?: string
  created_at?: string
}

export interface PenaltyItem {
  reason: string
  points: number
}

export interface Briefing {
  id: string
  company_id: string
  company_name?: string
  score_id?: string
  headline?: string
  standfirst?: string
  body_html?: string
  score_badge?: string
  recommendation?: string
  sector_tag?: string
  stage_tag?: string
  briefed_at?: string
  created_at?: string
}

export interface Interaction {
  id: string
  company_id: string
  company_name?: string
  type: InteractionType
  direction?: Direction
  contact_name?: string
  contact_email?: string
  subject?: string
  content?: string
  summary?: string
  sentiment?: Sentiment
  interaction_date?: string
  source_ref?: string
  created_at?: string
}

export interface NewsItem {
  id: string
  company_id: string
  company_name?: string
  headline: string
  body?: string
  source?: string
  source_url?: string
  news_date?: string
  relevance_score?: number
  created_at?: string
}

export interface DailyFeed {
  id: string
  feed_date: string
  ranked_companies: RankedCompany[]
  editorial_note?: string
  generated_at?: string
}

export interface RankedCompany {
  rank: number
  company_id: string
  company_name: string
  lv_final_score: number
  score_interpretation: string
  sector: string
  lv_status: LvStatus
  one_liner?: string
  latest_headline?: string
  move?: 'up' | 'down' | 'new' | 'same'
  move_delta?: number
}

export interface Import {
  id: string
  import_source: 'specter' | 'beauhurst' | 'manual'
  file_name?: string
  rows_total?: number
  rows_imported?: number
  rows_skipped?: number
  status?: 'pending' | 'processing' | 'complete' | 'failed'
  error_log?: unknown[]
  imported_at?: string
}

// Scoring API types
export interface ScoreRequest {
  company_id?: string
  company_name: string
  one_liner?: string
  sector?: string
  stage?: string
  founding_year?: number
  raise_amount?: string
  valuation?: string
  founders?: FounderJson[]
  traction?: string
  business_model?: string
  market_summary?: string
  deck_text?: string
  additional_context?: string
}

export interface ScoreResponse {
  success: boolean
  hard_filter_pass: boolean
  hard_filter_reason?: string
  scores?: {
    sector_fit: number
    round_quality: number
    team_quality: number
    problem_insight: number
    bm_traction: number
    gtm_market: number
    defensibility: number
  }
  rationales?: {
    sector_fit: string
    round_quality: string
    team_quality: string
    problem_insight: string
    bm_traction: string
    gtm_market: string
    defensibility: string
  }
  penalties: PenaltyItem[]
  bonus: number
  lv_final_score: number
  score_interpretation: string
  recommendation: Recommendation
  key_risks: string[]
  key_questions: string[]
}

// LV scoring weights
export const SCORE_WEIGHTS = {
  round_quality: 0.20,
  team_quality: 0.25,
  problem_insight: 0.15,
  bm_traction: 0.15,
  gtm_market: 0.15,
  defensibility: 0.10,
  sector_fit: 0.00, // sector_fit is not in PDF final formula but we capture it
} as const

export function calculateLvFinalScore(scores: {
  sector_fit?: number
  round_quality?: number
  team_quality?: number
  problem_insight?: number
  bm_traction?: number
  gtm_market?: number
  defensibility?: number
}, penalties = 0, bonus = 0): number {
  const s = {
    round_quality: scores.round_quality ?? 0,
    team_quality: scores.team_quality ?? 0,
    problem_insight: scores.problem_insight ?? 0,
    bm_traction: scores.bm_traction ?? 0,
    gtm_market: scores.gtm_market ?? 0,
    defensibility: scores.defensibility ?? 0,
  }
  const weighted =
    s.round_quality * 0.20 +
    s.team_quality * 0.25 +
    s.problem_insight * 0.15 +
    s.bm_traction * 0.15 +
    s.gtm_market * 0.15 +
    s.defensibility * 0.10
  return Math.max(0, Math.min(10, weighted - penalties + bonus))
}

export function interpretScore(score: number): string {
  if (score <= 3) return 'Reject'
  if (score <= 5) return 'Pass'
  if (score < 7) return 'Borderline'
  if (score < 8) return 'Proceed to Meeting'
  if (score < 9) return 'High Priority'
  if (score < 10) return 'High Conviction'
  return 'Outlier'
}

export const LV_STATUS_LABELS: Record<LvStatus, string> = {
  prospect: 'Prospect',
  outreach_sent: 'Outreach Sent',
  meeting_requested: 'Meeting Requested',
  met: 'Met',
  due_diligence: 'Due Diligence',
  term_sheet: 'Term Sheet',
  invested: 'Invested',
  passed: 'Passed',
  watching: 'Watching',
}

export const SOURCE_LABELS: Record<Source, string> = {
  inbound: 'Inbound',
  specter: 'Specter',
  beauhurst: 'Beauhurst',
  sifted: 'Sifted',
  linkedin: 'LinkedIn',
  manual: 'Manual',
}

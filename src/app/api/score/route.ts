import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { buildScoringPrompt } from '@/lib/scoring-prompt'
import { calculateLvFinalScore, interpretScore } from '@/lib/types'
import type { ScoreRequest, ScoreResponse } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body: ScoreRequest = await req.json()

    if (!body.company_name) {
      return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
    }

    const prompt = buildScoringPrompt(body)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in Claude response')

    const result: ScoreResponse = JSON.parse(jsonMatch[0])

    // Recalculate final score on server to ensure formula is correct
    if (result.hard_filter_pass && result.scores) {
      result.lv_final_score = Math.round(
        calculateLvFinalScore(
          {
            sector_fit: result.scores.sector_fit,
            round_quality: result.scores.round_quality,
            team_quality: result.scores.team_quality,
            problem_insight: result.scores.problem_insight,
            bm_traction: result.scores.bm_traction,
            gtm_market: result.scores.gtm_market,
            defensibility: result.scores.defensibility,
          },
          result.penalties?.reduce((sum, p) => sum + p.points, 0) ?? 0,
          result.bonus ?? 0
        ) * 10
      ) / 10
      result.score_interpretation = interpretScore(result.lv_final_score)
    }

    // Persist to Supabase if company_id provided
    if (body.company_id) {
      const sb = createServerClient()
      const penaltiesTotal = result.penalties?.reduce((s, p) => s + p.points, 0) ?? 0

      const { data: scoreRow } = await sb.from('scores').insert({
        company_id: body.company_id,
        company_name: body.company_name,
        hard_filter_triggered: !result.hard_filter_pass,
        hard_filter_reason: result.hard_filter_reason ?? null,
        hard_filter_details: result.hard_filter_pass ? {} : { reason: result.hard_filter_reason },
        sector_fit_score: result.scores?.sector_fit ?? null,
        round_quality_score: result.scores?.round_quality ?? null,
        team_quality_score: result.scores?.team_quality ?? null,
        problem_insight_score: result.scores?.problem_insight ?? null,
        bm_traction_score: result.scores?.bm_traction ?? null,
        gtm_market_score: result.scores?.gtm_market ?? null,
        defensibility_score: result.scores?.defensibility ?? null,
        sector_fit_rationale: result.rationales?.sector_fit ?? null,
        round_quality_rationale: result.rationales?.round_quality ?? null,
        team_quality_rationale: result.rationales?.team_quality ?? null,
        problem_insight_rationale: result.rationales?.problem_insight ?? null,
        bm_traction_rationale: result.rationales?.bm_traction ?? null,
        gtm_market_rationale: result.rationales?.gtm_market ?? null,
        defensibility_rationale: result.rationales?.defensibility ?? null,
        penalties_total: penaltiesTotal,
        penalties_detail: result.penalties ?? [],
        bonus_applied: result.bonus ?? 0,
        lv_final_score: result.lv_final_score,
        score_interpretation: result.score_interpretation,
        recommendation: result.recommendation,
        key_risks: result.key_risks ?? [],
        key_questions: result.key_questions ?? [],
        scoring_source: 'ai',
        model_version: 'claude-sonnet-4-6',
        scored_at: new Date().toISOString(),
      }).select().single()

      // Update company pipeline status
      await sb.from('companies').update({
        pipeline_status: 'scored',
        scored_at: new Date().toISOString(),
      }).eq('id', body.company_id)

      // If score is high enough, also create a briefing headline
      if (result.lv_final_score >= 6 && scoreRow) {
        await sb.from('briefings').insert({
          company_id: body.company_id,
          company_name: body.company_name,
          score_id: scoreRow.id,
          headline: `${body.company_name}: ${result.score_interpretation}`,
          standfirst: result.rationales?.team_quality ?? result.rationales?.problem_insight ?? null,
          score_badge: `${result.lv_final_score}`,
          recommendation: result.recommendation,
          sector_tag: body.sector ?? null,
          stage_tag: body.stage ?? null,
        })
        await sb.from('companies').update({ pipeline_status: 'briefed', briefed_at: new Date().toISOString() })
          .eq('id', body.company_id)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Scoring error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Scoring failed' }, { status: 500 })
  }
}

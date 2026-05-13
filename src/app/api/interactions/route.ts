import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Action: summarise — returns AI summary + sentiment without saving
    if (body.action === 'summarise') {
      const { content } = body
      if (!content?.trim()) return NextResponse.json({ summary: '', sentiment: 'neutral' })

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `You are an investment analyst assistant. Summarise the following investor communication in 2–3 sentences. Focus on: what was discussed, key signals about the company/founders, and any action items. Also assess the sentiment.

Respond ONLY with JSON:
{"summary": "2-3 sentence summary here", "sentiment": "positive|neutral|negative|mixed"}

COMMUNICATION:
${content.slice(0, 4000)}`,
        }],
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return NextResponse.json(result)
      }
      return NextResponse.json({ summary: text.slice(0, 500), sentiment: 'neutral' })
    }

    // Action: save — persists interaction to DB
    if (body.action === 'save') {
      const sb = createServerClient()

      // If no summary provided, auto-summarise if content is long
      let summary = body.summary
      let sentiment = body.sentiment
      if (!summary && body.content?.length > 200) {
        try {
          const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            messages: [{
              role: 'user',
              content: `Summarise this investor communication in 2-3 sentences. Focus on key signals and actions.
Respond ONLY with JSON: {"summary": "...", "sentiment": "positive|neutral|negative|mixed"}

${body.content.slice(0, 3000)}`,
            }],
          })
          const text = message.content[0].type === 'text' ? message.content[0].text : ''
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) { const r = JSON.parse(jsonMatch[0]); summary = r.summary; sentiment = r.sentiment }
        } catch { /* fall through without summary */ }
      }

      const { error } = await sb.from('interactions').insert({
        company_id: body.company_id,
        company_name: body.company_name ?? null,
        type: body.type,
        direction: body.direction ?? 'inbound',
        contact_name: body.contact_name ?? null,
        contact_email: body.contact_email ?? null,
        subject: body.subject ?? null,
        content: body.content,
        summary: summary ?? null,
        sentiment: sentiment ?? null,
        interaction_date: body.interaction_date ?? new Date().toISOString(),
        source_ref: body.source_ref ?? null,
      })

      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true })
    }

    // Action: get — fetch interactions for a company
    if (body.action === 'get') {
      const sb = createServerClient()
      const { data } = await sb.from('interactions').select('*')
        .eq('company_id', body.company_id)
        .order('interaction_date', { ascending: false })
        .limit(50)
      return NextResponse.json({ interactions: data ?? [] })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Interactions error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
  }
}

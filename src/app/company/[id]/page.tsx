import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScoreBadge from '@/components/ScoreBadge'
import { StatusBadge, SourceBadge } from '@/components/StatusBadge'
import ScoreBreakdown from '@/components/ScoreBreakdown'
import type { Company, Score, Briefing, Interaction, NewsItem, LvStatus, Source, FounderJson } from '@/lib/types'
import { LV_STATUS_LABELS } from '@/lib/types'
import ScoreButton from './ScoreButton'
import StatusUpdater from './StatusUpdater'
import EmailActions from './EmailActions'

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = createServerClient()

  const [{ data: company }, { data: scores }, { data: briefings }, { data: interactions }, { data: news }] = await Promise.all([
    sb.from('companies').select('*').eq('id', id).single(),
    sb.from('scores').select('*').eq('company_id', id).order('scored_at', { ascending: false }),
    sb.from('briefings').select('*').eq('company_id', id).order('briefed_at', { ascending: false }).limit(1),
    sb.from('interactions').select('*').eq('company_id', id).order('interaction_date', { ascending: false }).limit(20),
    sb.from('news_items').select('*').eq('company_id', id).order('news_date', { ascending: false }).limit(10),
  ])

  if (!company) notFound()

  const latestScore = (scores as Score[] | null)?.[0]
  const latestBriefing = (briefings as Briefing[] | null)?.[0]
  const founders: FounderJson[] = Array.isArray(company.founders) ? company.founders : []

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/" className="text-xs hover:underline mb-4 inline-block" style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
        ← Back to feed
      </Link>

      {/* Header */}
      <div className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--ft-border)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {latestScore?.lv_final_score != null && <ScoreBadge score={latestScore.lv_final_score} size="lg" />}
              {company.lv_status && <StatusBadge status={company.lv_status as LvStatus} />}
              {company.source && <SourceBadge source={company.source as Source} />}
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>{company.company_name}</h1>
            {(company.one_liner ?? latestBriefing?.headline) && (
              <p className="text-lg mt-1 leading-relaxed" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-grey)' }}>
                {company.one_liner ?? latestBriefing?.headline}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
              {company.sector && <span><strong>Sector:</strong> {company.sector}</span>}
              {company.stage && <span><strong>Stage:</strong> {company.stage}</span>}
              {company.founding_year && <span><strong>Founded:</strong> {company.founding_year}</span>}
              {company.verified_website && (
                <a href={company.verified_website} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--ft-teal)' }}>
                  Website ↗
                </a>
              )}
              {company.linkedin_url && (
                <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--ft-teal)' }}>
                  LinkedIn ↗
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[180px]">
            <ScoreButton companyId={company.id} company={company} />
            <EmailActions company={company} score={latestScore ?? undefined} />
            <StatusUpdater companyId={company.id} currentStatus={company.lv_status as LvStatus} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">

          {/* Briefing / summary */}
          {latestBriefing?.body_html && (
            <Section title="Investment Brief">
              <div
                className="prose prose-sm max-w-none text-sm leading-relaxed"
                style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-ink)' }}
                dangerouslySetInnerHTML={{ __html: latestBriefing.body_html }}
              />
              {latestScore?.key_risks && (latestScore.key_risks as string[]).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Key Risks</h4>
                  <ul className="space-y-1">
                    {(latestScore.key_risks as string[]).map((r, i) => (
                      <li key={i} className="text-sm flex gap-2" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                        <span style={{ color: 'var(--score-red)' }}>▸</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {latestScore?.key_questions && (latestScore.key_questions as string[]).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Key Questions</h4>
                  <ul className="space-y-1">
                    {(latestScore.key_questions as string[]).map((q, i) => (
                      <li key={i} className="text-sm flex gap-2" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                        <span style={{ color: 'var(--ft-teal)' }}>?</span> {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Traction & Market */}
          {(company.traction_signals ?? company.market_summary) && (
            <Section title="Traction & Market">
              {company.traction_signals && (
                <div className="mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Traction</h4>
                  <p className="text-sm leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>{company.traction_signals}</p>
                </div>
              )}
              {company.market_summary && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Market</h4>
                  <p className="text-sm leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>{company.market_summary}</p>
                </div>
              )}
            </Section>
          )}

          {/* Founders */}
          {founders.length > 0 && (
            <Section title="Founders">
              <div className="space-y-4">
                {founders.map((f: FounderJson, i: number) => (
                  <div key={i} className="p-3 rounded-lg border" style={{ borderColor: 'var(--ft-border)', backgroundColor: 'var(--ft-cream)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{f.name}</p>
                        {f.title && <p className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{f.title}</p>}
                      </div>
                      {f.linkedin && (
                        <a href={f.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline shrink-0" style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                          LinkedIn ↗
                        </a>
                      )}
                    </div>
                    {f.background && <p className="text-xs mt-2 leading-relaxed" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-grey)' }}>{f.background}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Interaction history */}
          {(interactions as Interaction[] | null)?.length ? (
            <Section title={`Communications (${(interactions as Interaction[]).length})`}>
              <div className="space-y-3">
                {(interactions as Interaction[]).map((int) => (
                  <div key={int.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--ft-border)', backgroundColor: 'white' }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--ft-cream-dark)', color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                        {int.type}
                      </span>
                      {int.direction && (
                        <span className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                          {int.direction === 'inbound' ? '← Inbound' : int.direction === 'outbound' ? '→ Outbound' : '⟳ Internal'}
                        </span>
                      )}
                      {int.contact_name && <span className="text-xs font-medium" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{int.contact_name}</span>}
                      {int.sentiment && (
                        <span className="text-xs ml-auto" style={{
                          color: int.sentiment === 'positive' ? 'var(--score-green)' : int.sentiment === 'negative' ? 'var(--score-red)' : 'var(--ft-grey)',
                          fontFamily: 'Helvetica Neue, Arial, sans-serif'
                        }}>
                          {int.sentiment}
                        </span>
                      )}
                    </div>
                    {int.subject && <p className="text-sm font-medium mb-1" style={{ fontFamily: 'Georgia, serif' }}>{int.subject}</p>}
                    {int.summary && <p className="text-sm leading-relaxed" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-grey)' }}>{int.summary}</p>}
                    {!int.summary && int.content && (
                      <p className="text-sm leading-relaxed line-clamp-3" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-grey)' }}>{int.content}</p>
                    )}
                    <p className="text-xs mt-2" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                      {int.interaction_date ? new Date(int.interaction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </p>
                  </div>
                ))}
              </div>
              <Link href={`/comms?company_id=${company.id}`} className="mt-3 inline-block text-xs hover:underline" style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                + Add communication
              </Link>
            </Section>
          ) : (
            <Section title="Communications">
              <p className="text-sm" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>No communications logged yet.</p>
              <Link href={`/comms?company_id=${company.id}`} className="mt-2 inline-block text-xs hover:underline" style={{ color: 'var(--ft-teal)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                + Log first communication
              </Link>
            </Section>
          )}

          {/* News */}
          {(news as NewsItem[] | null)?.length ? (
            <Section title="News">
              <div className="space-y-3">
                {(news as NewsItem[]).map((n) => (
                  <div key={n.id} className="border-b last:border-0 pb-3 last:pb-0" style={{ borderColor: 'var(--ft-border)' }}>
                    <p className="text-sm font-medium leading-snug" style={{ fontFamily: 'Georgia, serif' }}>{n.headline}</p>
                    {n.body && <p className="text-xs mt-1 leading-relaxed" style={{ fontFamily: 'Georgia, serif', color: 'var(--ft-grey)' }}>{n.body}</p>}
                    <div className="flex items-center gap-2 mt-1" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                      {n.news_date && <span className="text-xs" style={{ color: 'var(--ft-grey)' }}>{new Date(n.news_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      {n.source && <span className="text-xs" style={{ color: 'var(--ft-grey)' }}>{n.source}</span>}
                      {n.source_url && <a href={n.source_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--ft-teal)' }}>Read ↗</a>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          {/* Score breakdown */}
          {latestScore && (
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'white', borderColor: 'var(--ft-border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                Score Breakdown
              </h3>
              <ScoreBreakdown score={latestScore} />
              {latestScore.scored_at && (
                <p className="text-xs mt-3" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                  Scored {new Date(latestScore.scored_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {latestScore.scoring_source && ` · ${latestScore.scoring_source}`}
                </p>
              )}
            </div>
          )}

          {/* Round details */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--ft-cream-dark)', borderColor: 'var(--ft-border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Round Details</h3>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Raise', value: company.raise_amount_min && company.raise_amount_max ? `£${(company.raise_amount_min / 1000).toFixed(0)}k–£${(company.raise_amount_max / 1000).toFixed(0)}k` : company.raise_amount_min ? `£${(company.raise_amount_min / 1000).toFixed(0)}k+` : null },
                { label: 'Pre-money val.', value: company.valuation_pre_money ? `£${(company.valuation_pre_money / 1000000).toFixed(1)}m` : null },
                { label: 'EIS eligible', value: company.eis_eligible === true ? 'Yes' : company.eis_eligible === false ? 'No' : null },
                { label: 'UK registered', value: company.uk_registered === true ? 'Yes' : company.uk_registered === false ? 'No' : null },
                { label: 'Business model', value: company.business_model },
                { label: 'Tech category', value: company.tech_category },
                { label: 'Employees', value: company.linkedin_employee_count ? `~${company.linkedin_employee_count}` : null },
                { label: 'Co. House no.', value: company.companies_house_number },
                { label: 'Incorporated', value: company.incorporation_date ? new Date(company.incorporation_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null },
              ].filter((r) => r.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{label}</dt>
                  <dd className="text-xs font-medium text-right" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Score history */}
          {(scores as Score[] | null) && (scores as Score[]).length > 1 && (
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'white', borderColor: 'var(--ft-border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Score History</h3>
              <div className="space-y-2">
                {(scores as Score[]).map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                      {s.scored_at ? new Date(s.scored_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : `Run ${(scores as Score[]).length - i}`}
                    </span>
                    <ScoreBadge score={s.lv_final_score} size="sm" showLabel={false} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{title}</h2>
        <div className="flex-1 border-t" style={{ borderColor: 'var(--ft-border)' }} />
      </div>
      {children}
    </section>
  )
}

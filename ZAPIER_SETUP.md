# Zapier → Supabase Scheduled Import

Automatically pushes new Specter / Beauhurst rows into the LV dashboard every time the Google Sheet updates.

---

## Prerequisites

1. Vercel is deployed and live (your `lv-dealflow-pipeline` app URL, e.g. `https://lv-dealflow-pipeline.vercel.app`)
2. `ZAPIER_WEBHOOK_SECRET` is set in Vercel dashboard → Project → Settings → Environment Variables. Pick any strong random string, e.g. `lv-zapier-2026-abc123`.

---

## Zap 1 — Specter Weekly Import

### Trigger: Schedule by Zapier
- Every: **1 Week** — Monday 8:00 AM

### Action 1: Google Sheets — Get Many Spreadsheet Rows
- Spreadsheet: _your Specter weekly export sheet_
- Worksheet: the tab with company data
- Rows from the bottom: **200** (to pick up new rows)

### Action 2: Looping by Zapier — Create Loop from Line Items
- Items: output rows from Action 1

### Action 3 (inside loop): Webhooks by Zapier — POST
- URL: `https://lv-dealflow-pipeline.vercel.app/api/zapier`
- Payload type: **JSON**
- Data:
  ```
  source: specter
  data__company name: <Company Name column from Google Sheets>
  data__website: <Website column>
  data__description: <Description column>
  data__sector: <Sector column>
  data__stage: <Stage column>
  data__raise size: <Raise Size column>
  data__valuation: <Valuation column>
  data__linkedin url: <LinkedIn URL column>
  data__id: <ID column>
  ```
- Headers:
  - `x-zapier-secret`: `<your ZAPIER_WEBHOOK_SECRET value>`
  - `Content-Type`: `application/json`

---

## Zap 2 — Beauhurst Weekly Import

Same structure as Zap 1 but:
- Different spreadsheet
- `source: beauhurst`
- Column names differ — use these mappings:
  ```
  data__company name:          <Company Name>
  data__website:               <Website>
  data__about:                 <About / Description>
  data__primary sector:        <Primary Sector>
  data__deal type:             <Deal Type>
  data__amount raised:         <Amount Raised>
  data__post-money valuation:  <Post-Money Valuation>
  data__linkedin:              <LinkedIn URL>
  data__company id:            <Company ID>
  data__companies house:       <Companies House Number>
  data__hq:                    <HQ / Location>
  ```

---

## Testing the webhook

Before setting up the full Zap, test the endpoint manually:

```bash
curl -X POST https://lv-dealflow-pipeline.vercel.app/api/zapier \
  -H "Content-Type: application/json" \
  -H "x-zapier-secret: your-secret-here" \
  -d '{
    "source": "specter",
    "data": {
      "company name": "Test Co",
      "website": "testco.io",
      "sector": "FinTech",
      "stage": "Seed",
      "raise size": "£2m"
    }
  }'
```

Expected response: `{"ok":true,"company_name":"Test Co","source":"specter"}`

You can also use the GET endpoint to verify connectivity:

```bash
curl -H "x-zapier-secret: your-secret-here" \
  https://lv-dealflow-pipeline.vercel.app/api/zapier
```

---

## What happens after import

Each imported company lands in Supabase with:
- `lv_status = prospect`
- `pipeline_status = enriched`
- `source = specter` or `beauhurst`

They appear on the `/pipeline` dashboard immediately. Run the **Score** button on any company page to trigger the AI scoring, or use the `beauhurst-specter-screener` Claude skill to batch-score and run LinkedIn enrichment.

---

## Deduplication

The endpoint uses `ON CONFLICT (company_name)` — if the same company appears again in a later weekly export it updates the enrichment data rather than creating a duplicate.

---

## Zap 3 — Inbound Pitch Email Sweep (Gmail → Score)

Automatically scores any founder pitch email sent to investors@loveventures.co.uk or founders@loveventures.co.uk.

### Trigger: Gmail — New Email Matching Search
- Search: `to:(investors@loveventures.co.uk OR founders@loveventures.co.uk) subject:(deck OR pitch OR invest OR raise OR seed OR pre-seed)`
- Run every 15 minutes

### Action 1: Claude AI — Summarise / Extract (or Code by Zapier)
Extract the following fields from the email body using a prompt:
```
From this email, extract:
- company_name
- one_liner (what the company does in one sentence)
- sector
- stage (pre-seed or seed)
- raise_amount (e.g. "£2m")
- founder_name
- founder_email (use the sender email)
Return as JSON.
```

### Action 2: Webhooks by Zapier — POST (add to pipeline)
- URL: `https://lv-dealflow-pipeline.vercel.app/api/zapier`
- Headers: `x-zapier-secret: <your secret>`
- Data:
  ```
  source: inbound
  data__company name: <company_name from Step 1>
  data__description: <one_liner from Step 1>
  data__sector: <sector from Step 1>
  data__stage: <stage from Step 1>
  data__raise size: <raise_amount from Step 1>
  ```

### Action 3: Webhooks by Zapier — POST (trigger AI score)
Immediately after inserting, trigger scoring:
- URL: `https://lv-dealflow-pipeline.vercel.app/api/score`
- Headers: `Content-Type: application/json`
- Data:
  ```json
  {
    "company_name": "<company_name>",
    "one_liner": "<one_liner>",
    "sector": "<sector>",
    "stage": "<stage>",
    "raise_amount": "<raise_amount>"
  }
  ```
  Note: omit `company_id` here — the score will be saved without a Supabase link. To link it, first call `/api/zapier`, capture the returned `id`, then pass it as `company_id` in the score call.

### Result
- Company lands in Supabase as `source = inbound`
- Scored immediately — if ≥ 6.5 it appears on the daily feed within 60 seconds
- If ≥ 6.5, automatically added to the **Deals** list in Affinity with a score note

---

## Env vars summary

| Variable | Where to get it | Used for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | All DB reads |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | All DB reads |
| `ANTHROPIC_API_KEY` | console.anthropic.com | AI scoring |
| `ZAPIER_WEBHOOK_SECRET` | You choose — any strong string | Zapier auth |
| `AFFINITY_API_KEY` | Affinity → Settings → API Keys | CRM sync |

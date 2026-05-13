'use client'
import { useState, useRef } from 'react'
import Papa from 'papaparse'

type ImportSource = 'specter' | 'beauhurst'
type RowPreview = Record<string, string>

// Known column name aliases for each source
const SPECTER_MAP: Record<string, string> = {
  'company name': 'company_name', 'name': 'company_name',
  'website': 'verified_website', 'url': 'verified_website',
  'description': 'one_liner', 'short description': 'one_liner', 'blurb': 'one_liner',
  'sector': 'sector', 'industry': 'sector', 'category': 'sector',
  'stage': 'stage', 'funding stage': 'stage',
  'founded': 'founding_year', 'founded year': 'founding_year', 'year founded': 'founding_year',
  'raise size': 'raise_amount_raw', 'funding amount': 'raise_amount_raw', 'round size': 'raise_amount_raw',
  'valuation': 'valuation_pre_money_raw',
  'linkedin': 'linkedin_url', 'linkedin url': 'linkedin_url',
  'id': 'specter_id',
}

const BEAUHURST_MAP: Record<string, string> = {
  'company name': 'company_name', 'name': 'company_name',
  'website': 'verified_website',
  'description': 'one_liner', 'about': 'one_liner',
  'sector': 'sector', 'primary sector': 'sector',
  'stage': 'stage', 'deal type': 'stage',
  'founded': 'founding_year', 'incorporation date': 'incorporation_date',
  'latest raise': 'raise_amount_raw', 'amount raised': 'raise_amount_raw',
  'valuation': 'valuation_pre_money_raw', 'post-money valuation': 'valuation_pre_money_raw',
  'company id': 'beauhurst_id', 'beauhurst id': 'beauhurst_id',
  'companies house': 'companies_house_number',
  'employee count': 'linkedin_employee_count',
  'linkedin': 'linkedin_url',
  'hq': 'linkedin_hq', 'location': 'linkedin_hq',
}

function mapRow(row: RowPreview, source: ImportSource): Record<string, unknown> {
  const colMap = source === 'specter' ? SPECTER_MAP : BEAUHURST_MAP
  const mapped: Record<string, unknown> = { source }
  for (const [col, val] of Object.entries(row)) {
    const norm = col.toLowerCase().trim()
    const field = colMap[norm]
    if (field && val) {
      if (field === 'founding_year') mapped[field] = parseInt(val) || null
      else if (field === 'linkedin_employee_count') mapped[field] = parseInt(val.replace(/[^0-9]/g, '')) || null
      else mapped[field] = val.trim()
    }
  }
  // Parse raise amounts
  if (mapped.raise_amount_raw) {
    const raw = String(mapped.raise_amount_raw).replace(/[£$,\s]/g, '')
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      const mult = String(mapped.raise_amount_raw).toLowerCase().includes('m') ? 1_000_000 : String(mapped.raise_amount_raw).toLowerCase().includes('k') ? 1_000 : 1
      mapped.raise_amount_min = Math.round(num * mult * 0.9)
      mapped.raise_amount_max = Math.round(num * mult * 1.1)
    }
    delete mapped.raise_amount_raw
  }
  if (mapped.valuation_pre_money_raw) {
    const raw = String(mapped.valuation_pre_money_raw).replace(/[£$,\s]/g, '')
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      const mult = String(mapped.valuation_pre_money_raw).toLowerCase().includes('m') ? 1_000_000 : String(mapped.valuation_pre_money_raw).toLowerCase().includes('k') ? 1_000 : 1
      mapped.valuation_pre_money = Math.round(num * mult)
    }
    delete mapped.valuation_pre_money_raw
  }
  return mapped
}

export default function ImportPage() {
  const [source, setSource] = useState<ImportSource>('specter')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [rawRows, setRawRows] = useState<RowPreview[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setFileName(file.name)
    setResult(null)
    setError('')
    Papa.parse<RowPreview>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        setHeaders(parsed.meta.fields ?? [])
        setRawRows(parsed.data.slice(0, 5))
        setRows(parsed.data.map((r) => mapRow(r, source)))
      },
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  async function handleImport() {
    setImporting(true)
    setError('')
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, rows, file_name: fileName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setResult({ imported: data.imported, skipped: data.skipped })
      setRows([])
      setRawRows([])
      setHeaders([])
      setFileName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Import Companies</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          Upload a Specter or Beauhurst CSV export. Duplicate companies (matched by name or domain) will be skipped.
        </p>
      </div>

      {/* Source selector */}
      <div className="mb-6 flex gap-3">
        {(['specter', 'beauhurst'] as ImportSource[]).map((s) => (
          <button
            key={s}
            onClick={() => { setSource(s); setRows([]); setRawRows([]); setHeaders([]) }}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              backgroundColor: source === s ? 'var(--lv-burgundy)' : 'white',
              color: source === s ? 'white' : 'var(--ft-ink)',
              borderColor: source === s ? 'var(--lv-burgundy)' : 'var(--ft-border)',
              fontFamily: 'Helvetica Neue, Arial, sans-serif',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:opacity-80 transition-opacity mb-6"
        style={{ borderColor: 'var(--ft-border)', backgroundColor: 'white' }}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <p className="text-2xl mb-2">📄</p>
        <p className="font-medium" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          {fileName || 'Drop CSV here or click to browse'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          Accepts Specter and Beauhurst CSV exports
        </p>
      </div>

      {/* Preview */}
      {rawRows.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
              Preview — {rows.length} rows detected
            </h2>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2 rounded text-white text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--lv-burgundy)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
            >
              {importing ? 'Importing...' : `Import ${rows.length} Companies`}
            </button>
          </div>

          <div className="rounded-lg border overflow-x-auto" style={{ borderColor: 'var(--ft-border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--ft-cream-dark)' }}>
                  {headers.slice(0, 8).map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'var(--ft-grey)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.map((row, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--ft-border)', backgroundColor: i % 2 === 0 ? 'white' : 'var(--ft-cream)' }}>
                    {headers.slice(0, 8).map((h) => (
                      <td key={h} className="px-3 py-2 truncate max-w-xs" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                        {row[h] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p className="text-xs px-3 py-2 border-t" style={{ borderColor: 'var(--ft-border)', color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
                + {rows.length - 5} more rows
              </p>
            )}
          </div>
        </div>
      )}

      {/* Result / error */}
      {result && (
        <div className="p-4 rounded-lg border text-sm" style={{ backgroundColor: '#ECFDF5', borderColor: '#6EE7B7', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          ✅ Import complete: <strong>{result.imported}</strong> companies added, <strong>{result.skipped}</strong> skipped (duplicates).
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg border text-sm" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          ❌ {error}
        </div>
      )}

      {/* Help */}
      <div className="mt-8 p-4 rounded-lg border" style={{ borderColor: 'var(--ft-border)', backgroundColor: 'var(--ft-cream-dark)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>Column Mapping</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ft-grey)', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          The importer automatically maps common Specter and Beauhurst columns. Expected columns include:
          <strong> Company Name</strong>, <strong>Website</strong>, <strong>Description</strong>, <strong>Sector</strong>,
          <strong> Stage</strong>, <strong>Founded</strong>, <strong>Raise Size</strong>, <strong>Valuation</strong>,
          <strong> LinkedIn</strong>. Any unmapped columns are ignored.
        </p>
      </div>
    </div>
  )
}

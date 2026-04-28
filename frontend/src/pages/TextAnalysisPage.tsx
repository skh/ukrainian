import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { CandidateCard, entryPath } from '../components/GorohLookup'
import { api } from '../api/client'
import { AnalyzedToken, AnalysisTokenMatch, AnalyzeResponse, GorohCandidate } from '../types'

function MatchEntry({ match }: { match: AnalysisTokenMatch }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.2rem' }}>
        <strong style={{ fontSize: '1.05em' }}>{match.accented}</strong>
        <span className="badge text-dim" style={{ background: '#e5e7eb' }}>{match.pos}</span>
      </div>
      {match.translations.length > 0 && (
        <div>
          {match.translations.map((t, i) => (
            <span key={i} style={{ marginRight: '0.75rem' }}>
              <span className="text-muted">{t.lang}:</span> {t.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Tooltip({ matches, x, y }: { matches: AnalysisTokenMatch[]; x: number; y: number }) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.min(x + 14, vw - 340)
  const top = Math.min(y + 14, vh - 240)

  return (
    <div style={{
      position: 'fixed', left, top, zIndex: 1000,
      background: 'white', border: '1px solid #ccc', borderRadius: '6px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      padding: '0.6rem 0.8rem', maxWidth: '320px', fontSize: '0.82em',
      pointerEvents: 'none',
    }}>
      {matches.map((m, i) => (
        <div key={m.lexeme_id}>
          {i > 0 && <hr style={{ margin: '0.4rem 0', borderColor: '#eee' }} />}
          <MatchEntry match={m} />
        </div>
      ))}
    </div>
  )
}


export default function TextAnalysisPage() {
  const [inputText, setInputText] = useState('')
  const [tokens, setTokens] = useState<AnalyzedToken[]>([])
  const [unknown, setUnknown] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState<{ matches: AnalysisTokenMatch[]; x: number; y: number } | null>(null)

  // goroh lookup state for unknown words
  const [activeWord, setActiveWord] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<GorohCandidate[] | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [added, setAdded] = useState<Map<string, { id: number; pos: string; accented: string }>>(new Map())

  async function analyze() {
    if (!inputText.trim()) return
    setLoading(true)
    try {
      const result = await api.post<AnalyzeResponse>('/analyze-text', { text: inputText })
      setTokens(result.tokens)
      setUnknown(result.unknown)
      setActiveWord(null)
      setCandidates(null)
      setAdded(new Map())
    } finally {
      setLoading(false)
    }
  }

  async function lookUp(word: string) {
    if (activeWord === word) {
      setActiveWord(null)
      setCandidates(null)
      return
    }
    setActiveWord(word)
    setCandidates(null)
    setSelectedId(null)
    setLookupError('')
    setLookupLoading(true)
    try {
      const results = await api.get<GorohCandidate[]>(`/goroh-fetch?word=${encodeURIComponent(word)}`)
      setCandidates(results)
    } catch (err) {
      setLookupError(String(err))
    } finally {
      setLookupLoading(false)
    }
  }

  function handleSaved(id: number, pos: string) {
    const accented = candidates?.find(c => c.goroh_id === selectedId)?.accented ?? activeWord ?? ''
    setAdded(prev => new Map(prev).set(activeWord!, { id, pos, accented }))
    setCandidates(prev => prev?.map(c =>
      c.goroh_id === selectedId ? { ...c, already_exists: true, existing_id: id } : c
    ) ?? null)
    setSelectedId(null)
  }

  const handleMouseEnter = useCallback((matches: AnalysisTokenMatch[], e: React.MouseEvent) => {
    setTooltip({ matches, x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const handleMouseMove = useCallback((matches: AnalysisTokenMatch[], e: React.MouseEvent) => {
    setTooltip(prev => prev ? { matches, x: e.clientX, y: e.clientY } : null)
  }, [])

  return (
    <div>
      <Nav />
      <h1>Analyze text</h1>

      <textarea
        rows={6}
        style={{ width: '100%', maxWidth: '700px', fontFamily: 'inherit', fontSize: '1em', padding: '0.5rem' }}
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        placeholder="Paste Ukrainian text here…"
      />
      <br />
      <button onClick={analyze} disabled={loading || !inputText.trim()} style={{ marginTop: '0.5rem' }}>
        {loading ? 'Analyzing…' : 'Analyze'}
      </button>

      {tokens.length > 0 && (
        <>
          <div style={{
            marginTop: '1.5rem', lineHeight: '1.9', fontSize: '1.05em',
            whiteSpace: 'pre-wrap', maxWidth: '700px',
          }}>
            {tokens.map((tok, i) => {
              if (!tok.matches?.length) {
                const norm = tok.text.toLowerCase().replace(/\u0301/g, '').replace(/['\u2019\u02BC]/g, '\u2019')
                const isActive = activeWord !== null && norm === activeWord
                if (!isActive) return <span key={i}>{tok.text}</span>
                return (
                  <span key={i} style={{ background: '#fde68a', borderRadius: '3px', padding: '0.05em 0.1em' }}>
                    {tok.text}
                  </span>
                )
              }
              return (
                <span
                  key={i}
                  style={{
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    padding: '0.05em 0.1em',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => handleMouseEnter(tok.matches!, e)}
                  onMouseLeave={handleMouseLeave}
                  onMouseMove={e => handleMouseMove(tok.matches!, e)}
                >
                  {tok.text}
                </span>
              )
            })}
          </div>

          {unknown.length > 0 && (
            <div style={{ marginTop: '1.5rem', maxWidth: '700px' }}>
              <h3 className="text-secondary" style={{ marginBottom: '0.4rem' }}>
                Unknown words ({unknown.length - added.size} remaining)
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.6rem', marginBottom: '0.75rem' }}>
                {unknown.map(w => {
                  const savedEntry = added.get(w)
                  if (savedEntry) {
                    return (
                      <span key={w} style={{ fontSize: '0.9em' }}>
                        <span style={{ color: 'green' }}>✓</span>{' '}
                        <Link to={entryPath(savedEntry.pos, savedEntry.id)}>{savedEntry.accented}</Link>
                      </span>
                    )
                  }
                  return (
                    <button
                      key={w}
                      onClick={() => lookUp(w)}
                      style={{
                        background: activeWord === w ? '#111' : 'transparent',
                        color: activeWord === w ? '#fff' : '#005BBB',
                        border: `1px solid ${activeWord === w ? '#111' : '#005BBB'}`,
                        borderRadius: '4px',
                        padding: '0.1em 0.5em',
                        fontSize: '0.9em',
                        cursor: 'pointer',
                      }}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>

              {activeWord && (
                <div style={{ marginTop: '0.5rem' }}>
                  {lookupLoading && <p className="text-muted">Fetching…</p>}
                  {lookupError && <p className="text-danger">{lookupError}</p>}
                  {candidates !== null && candidates.length === 0 && (
                    <p className="text-muted">No goroh candidates found for "{activeWord}".</p>
                  )}
                  {candidates?.map(c => (
                    <CandidateCard
                      key={c.goroh_id}
                      candidate={c}
                      selected={selectedId === c.goroh_id}
                      onSelect={() => setSelectedId(c.goroh_id)}
                      onSaved={handleSaved}
                      onCancel={() => setSelectedId(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tooltip && <Tooltip matches={tooltip.matches} x={tooltip.x} y={tooltip.y} />}
    </div>
  )
}

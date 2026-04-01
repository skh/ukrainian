import { useState, useCallback } from 'react'
import { Nav } from '../components/Nav'
import { api } from '../api/client'
import { AnalyzedToken, AnalysisTokenMatch, AnalyzeResponse } from '../types'
import { genderBg, CASES, CASE_LABELS } from '../utils/nouns'
import { aspectBg } from '../utils/theme'

function matchBg(m: AnalysisTokenMatch): string {
  if (m.pos === 'noun') return genderBg[m.gender ?? ''] ?? '#d1fae5'
  if (m.pos === 'pair') return '#fef9c3'
  if (m.pos === 'adjective') return '#e9d5ff'
  return '#e0f2fe'
}

function Tooltip({ match, x, y }: { match: AnalysisTokenMatch; x: number; y: number }) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.min(x + 14, vw - 340)
  const top = Math.min(y + 14, vh - 400)

  const PERSON_LABELS: Record<string, string> = { '1': '1', '2': '2', '3': '3' }
  const TENSE_ORDER = ['present', 'future', 'past', 'imperative']

  return (
    <div style={{
      position: 'fixed', left, top, zIndex: 1000,
      background: 'white', border: '1px solid #ccc', borderRadius: '6px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      padding: '0.6rem 0.8rem', maxWidth: '320px', fontSize: '0.82em',
      pointerEvents: 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.3rem' }}>
        <strong style={{ fontSize: '1.1em' }}>{match.accented}</strong>
        <span style={{
          background: matchBg(match), padding: '0.1em 0.4em',
          borderRadius: '3px', fontSize: '0.85em', color: '#555',
        }}>{match.pos}</span>
      </div>

      {/* Translations */}
      {match.translations.length > 0 && (
        <div style={{ marginBottom: '0.4rem' }}>
          {match.translations.map((t, i) => (
            <span key={i} style={{ marginRight: '0.75rem' }}>
              <span style={{ color: '#888' }}>{t.lang}:</span> {t.text}
            </span>
          ))}
        </div>
      )}

      {/* Noun paradigm */}
      {match.pos === 'noun' && match.forms.length > 0 && (() => {
        const hasSg = match.forms.some(f => f.tags.endsWith(',sg'))
        const hasPl = match.forms.some(f => f.tags.endsWith(',pl'))
        return (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={thStyle}></th>
                {hasSg && <th style={thStyle}>sg</th>}
                {hasPl && <th style={thStyle}>pl</th>}
              </tr>
            </thead>
            <tbody>
              {CASES.map(c => {
                const sg = match.forms.filter(f => f.tags === `${c},sg`).map(f => f.form).join(', ')
                const pl = match.forms.filter(f => f.tags === `${c},pl`).map(f => f.form).join(', ')
                if (!sg && !pl) return null
                return (
                  <tr key={c}>
                    <td style={{ ...tdStyle, color: '#888' }}>{CASE_LABELS[c]}</td>
                    {hasSg && <td style={tdStyle}>{sg || '—'}</td>}
                    {hasPl && <td style={tdStyle}>{pl || '—'}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
      })()}

      {/* Verb pair paradigm */}
      {match.pos === 'pair' && match.verbs.length > 0 && (
        <div>
          {match.verbs.map(v => {
            const tenses = TENSE_ORDER.filter(t => v.forms.some(f => f.tags.startsWith(t)))
            return (
              <div key={v.accented} style={{ marginBottom: '0.4rem' }}>
                <div style={{
                  background: v.aspect === 'ipf' ? aspectBg.ipf : aspectBg.pf,
                  padding: '0.1em 0.4em', borderRadius: '3px', marginBottom: '0.25rem',
                  display: 'inline-block', fontWeight: 'bold',
                }}>
                  {v.accented}
                </div>
                {tenses.map(tense => {
                  const tForms = v.forms.filter(f => f.tags.startsWith(tense))
                  if (tense === 'past') {
                    return (
                      <div key={tense} style={{ marginBottom: '0.2rem' }}>
                        <span style={{ color: '#888', marginRight: '0.3rem' }}>past:</span>
                        {['singular,masculine', 'singular,feminine', 'singular,neuter', 'plural'].map(tag => {
                          const f = tForms.find(x => x.tags === `past,${tag}`)
                          return f ? <span key={tag} style={{ marginRight: '0.3rem' }}>{f.form}</span> : null
                        })}
                      </div>
                    )
                  }
                  if (tense === 'imperative') {
                    return (
                      <div key={tense} style={{ marginBottom: '0.2rem' }}>
                        <span style={{ color: '#888', marginRight: '0.3rem' }}>imp:</span>
                        {tForms.map(f => <span key={f.tags} style={{ marginRight: '0.3rem' }}>{f.form}</span>)}
                      </div>
                    )
                  }
                  // present / future
                  const rows = [
                    ['1', 'singular'], ['2', 'singular'], ['3', 'singular'],
                    ['1', 'plural'], ['2', 'plural'], ['3', 'plural'],
                  ]
                  return (
                    <table key={tense} style={{ borderCollapse: 'collapse', marginBottom: '0.2rem' }}>
                      <thead>
                        <tr><th style={{ ...thStyle, textAlign: 'left', color: '#888' }} colSpan={2}>{tense}</th></tr>
                      </thead>
                      <tbody>
                        {rows.map(([person, number]) => {
                          const f = tForms.find(x => x.tags === `${tense},${person},${number}`)
                          if (!f) return null
                          return (
                            <tr key={`${person}${number}`}>
                              <td style={{ ...tdStyle, color: '#888', paddingRight: '0.5rem' }}>
                                {PERSON_LABELS[person]}{number === 'singular' ? 'sg' : 'pl'}
                              </td>
                              <td style={tdStyle}>{f.form}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Other pos: just list forms if any */}
      {match.pos !== 'noun' && match.pos !== 'pair' && match.forms.length > 0 && (
        <div style={{ marginTop: '0.2rem' }}>
          {match.forms.map((f, i) => (
            <span key={i} style={{ marginRight: '0.5rem', color: '#555' }}>
              <span style={{ color: '#aaa' }}>{f.tags}:</span> {f.form}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '0.1em 0.35em', fontWeight: 'normal', color: '#888', textAlign: 'center' }
const tdStyle: React.CSSProperties = { padding: '0.1em 0.35em' }

export default function TextAnalysisPage() {
  const [inputText, setInputText] = useState('')
  const [tokens, setTokens] = useState<AnalyzedToken[]>([])
  const [unknown, setUnknown] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState<{ match: AnalysisTokenMatch; x: number; y: number } | null>(null)

  async function analyze() {
    if (!inputText.trim()) return
    setLoading(true)
    try {
      const result = await api.post<AnalyzeResponse>('/analyze-text', { text: inputText })
      setTokens(result.tokens)
      setUnknown(result.unknown)
    } finally {
      setLoading(false)
    }
  }

  const handleMouseEnter = useCallback((match: AnalysisTokenMatch, e: React.MouseEvent) => {
    setTooltip({ match, x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const handleMouseMove = useCallback((match: AnalysisTokenMatch, e: React.MouseEvent) => {
    setTooltip(prev => prev ? { match, x: e.clientX, y: e.clientY } : null)
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
              if (!tok.match) {
                return <span key={i}>{tok.text}</span>
              }
              return (
                <span
                  key={i}
                  style={{
                    background: matchBg(tok.match),
                    borderRadius: '3px',
                    padding: '0.05em 0.1em',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => handleMouseEnter(tok.match!, e)}
                  onMouseLeave={handleMouseLeave}
                  onMouseMove={e => handleMouseMove(tok.match!, e)}
                >
                  {tok.text}
                </span>
              )
            })}
          </div>

          {unknown.length > 0 && (
            <div style={{ marginTop: '1.5rem', maxWidth: '700px' }}>
              <h3 style={{ marginBottom: '0.4rem', color: '#666' }}>Unknown words ({unknown.length})</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.6rem' }}>
                {unknown.map(w => (
                  <span key={w} style={{ color: '#888', fontSize: '0.9em' }}>{w}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tooltip && <Tooltip match={tooltip.match} x={tooltip.x} y={tooltip.y} />}
    </div>
  )
}

import { useState, useCallback } from 'react'
import { Nav } from '../components/Nav'
import { api } from '../api/client'
import { AnalyzedToken, AnalysisTokenMatch, AnalyzeResponse } from '../types'

function Tooltip({ match, x, y }: { match: AnalysisTokenMatch; x: number; y: number }) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.min(x + 14, vw - 340)
  const top = Math.min(y + 14, vh - 200)

  return (
    <div style={{
      position: 'fixed', left, top, zIndex: 1000,
      background: 'white', border: '1px solid #ccc', borderRadius: '6px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      padding: '0.6rem 0.8rem', maxWidth: '320px', fontSize: '0.82em',
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.3rem' }}>
        <strong style={{ fontSize: '1.1em' }}>{match.accented}</strong>
        <span style={{
          background: '#e5e7eb', padding: '0.1em 0.4em',
          borderRadius: '3px', fontSize: '0.85em', color: '#555',
        }}>{match.pos}</span>
      </div>
      {match.translations.length > 0 && (
        <div>
          {match.translations.map((t, i) => (
            <span key={i} style={{ marginRight: '0.75rem' }}>
              <span style={{ color: '#888' }}>{t.lang}:</span> {t.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}


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
                    background: '#e5e7eb',
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

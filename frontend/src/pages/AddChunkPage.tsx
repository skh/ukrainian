import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Chunk, SuggestedLink } from '../types'
import { Nav } from '../components/Nav'

const LANGS = ['uk', 'en', 'de', 'fr', 'pl']

export default function AddChunkPage() {
  const navigate = useNavigate()
  const [lang, setLang] = useState('uk')
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestedLink[]>([])
  const [selectedLexemeIds, setSelectedLexemeIds] = useState<Set<number>>(new Set())
  const [suggestError, setSuggestError] = useState('')
  const [saveError, setSaveError] = useState('')

  async function handleSuggest() {
    setSuggestError('')
    if (!text.trim()) return
    try {
      const s = await api.get<SuggestedLink[]>(`/chunks/suggest-links?text=${encodeURIComponent(text)}`)
      setSuggestions(s)
      setSelectedLexemeIds(new Set(s.map(x => x.lexeme_id)))
    } catch {
      setSuggestError('Failed to fetch suggestions.')
    }
  }

  function toggleLink(id: number) {
    setSelectedLexemeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaveError('')
    if (!text.trim()) { setSaveError('Text is required.'); return }
    try {
      const chunk = await api.post<Chunk>('/chunks', { lang, text: text.trim(), notes: notes.trim() || null })
      for (const lexeme_id of selectedLexemeIds) {
        await api.post(`/chunks/${chunk.id}/links`, { lexeme_id })
      }
      navigate(`/chunks/${chunk.id}`)
    } catch (err) {
      setSaveError(String(err))
    }
  }

  return (
    <div>
      <Nav />
      <h1>Add chunk</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Language:{' '}
          <select value={lang} onChange={e => setLang(e.target.value)}>
            {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>Text:</label>
        <textarea
          rows={3}
          cols={60}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter phrase or expression…"
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Notes (optional):{' '}
          <input value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '30rem' }} />
        </label>
      </div>

      <button onClick={handleSuggest} disabled={!text.trim()}>
        Suggest word links
      </button>
      {suggestError && <span style={{ color: 'red', marginLeft: '0.5em' }}>{suggestError}</span>}

      {suggestions.length > 0 && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold' }}>Suggested word links:</p>
          {suggestions.map(s => (
            <label key={s.lexeme_id} style={{ display: 'block', marginBottom: '0.25rem' }}>
              <input
                type="checkbox"
                checked={selectedLexemeIds.has(s.lexeme_id)}
                onChange={() => toggleLink(s.lexeme_id)}
              />{' '}
              <span style={{ fontStyle: 'italic' }}>{s.lexeme_form}</span>
              {' '}({s.lexeme_pos}) — matched "{s.matched_form}"
            </label>
          ))}
          {suggestions.length === 0 && <p style={{ color: '#aaa' }}>No matches found.</p>}
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <button onClick={handleSave} disabled={!text.trim()}>Save chunk</button>
        {saveError && <span style={{ color: 'red', marginLeft: '0.5em' }}>{saveError}</span>}
      </div>
    </div>
  )
}

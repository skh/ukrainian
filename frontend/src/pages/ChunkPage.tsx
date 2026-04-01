import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { Chunk, SuggestedLink, Tag } from '../types'
import { Nav } from '../components/Nav'
import { TagChip } from '../widgets/TagChip'

const LANGS = ['uk', 'en', 'de', 'fr', 'pl']

export default function ChunkPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [chunk, setChunk] = useState<Chunk | null>(null)

  // edit state
  const [editLang, setEditLang] = useState('')
  const [editText, setEditText] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [metaSaved, setMetaSaved] = useState(false)

  // translations
  const [newTransLang, setNewTransLang] = useState('de')
  const [newTransText, setNewTransText] = useState('')
  const [editTransId, setEditTransId] = useState<number | null>(null)
  const [editTransText, setEditTransText] = useState('')

  // links
  const [suggestions, setSuggestions] = useState<SuggestedLink[]>([])
  const [showSuggest, setShowSuggest] = useState(false)

  // tags
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [addTagId, setAddTagId] = useState<number | ''>('')
  const [newTagName, setNewTagName] = useState('')

  // delete
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function load(c: Chunk) {
    setChunk(c)
    setEditLang(c.lang)
    setEditText(c.text)
    setEditNotes(c.notes ?? '')
  }

  useEffect(() => {
    if (id) api.get<Chunk>(`/chunks/${id}`).then(load)
    api.get<Tag[]>('/tags').then(setAllTags)
  }, [id])

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault()
    if (!chunk) return
    const updated = await api.patch<Chunk>(`/chunks/${chunk.id}`, {
      lang: editLang,
      text: editText.trim(),
      notes: editNotes.trim() || null,
    })
    load(updated)
    setMetaSaved(true)
    setTimeout(() => setMetaSaved(false), 1500)
  }

  async function addTranslation() {
    if (!chunk || !newTransText.trim()) return
    const updated = await api.post<Chunk>(`/chunks/${chunk.id}/translations`, {
      lang: newTransLang,
      text: newTransText.trim(),
    })
    load(updated)
    setNewTransText('')
  }

  async function saveTranslation(tid: number) {
    if (!chunk) return
    const updated = await api.put<Chunk>(`/chunk-translations/${tid}`, { text: editTransText.trim() })
    load(updated)
    setEditTransId(null)
  }

  async function deleteTranslation(tid: number) {
    if (!chunk) return
    await api.delete(`/chunk-translations/${tid}`)
    load({ ...chunk, translations: chunk.translations.filter(t => t.id !== tid) })
  }

  async function suggestLinks() {
    if (!chunk) return
    const s = await api.get<SuggestedLink[]>(`/chunks/suggest-links?text=${encodeURIComponent(chunk.text)}`)
    setSuggestions(s.filter(sg => !chunk.links.some(l => l.lexeme_id === sg.lexeme_id)))
    setShowSuggest(true)
  }

  async function addLink(lexeme_id: number) {
    if (!chunk) return
    const updated = await api.post<Chunk>(`/chunks/${chunk.id}/links`, { lexeme_id })
    load(updated)
    setSuggestions(prev => prev.filter(s => s.lexeme_id !== lexeme_id))
  }

  async function removeLink(linkId: number) {
    if (!chunk) return
    await api.delete(`/chunk-links/${linkId}`)
    load({ ...chunk, links: chunk.links.filter(l => l.id !== linkId) })
  }

  async function addTag() {
    if (!chunk || addTagId === '') return
    const updated = await api.post<Chunk>(`/chunks/${chunk.id}/tags/${addTagId}`, {})
    load(updated)
    setAddTagId('')
  }

  async function createAndAddTag() {
    if (!chunk || !newTagName.trim()) return
    const tag = await api.post<Tag>('/tags', { name: newTagName.trim() })
    if (!allTags.some(t => t.id === tag.id)) setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
    const updated = await api.post<Chunk>(`/chunks/${chunk.id}/tags/${tag.id}`, {})
    load(updated)
    setNewTagName('')
  }

  async function removeTag(tagId: number) {
    if (!chunk) return
    await api.delete(`/chunks/${chunk.id}/tags/${tagId}`)
    load({ ...chunk, tags: chunk.tags.filter(t => t.id !== tagId) })
  }

  async function handleDelete() {
    if (!chunk) return
    try {
      await api.delete(`/chunks/${chunk.id}`)
      navigate('/chunks')
    } catch (err) {
      setDeleteError(String(err))
      setConfirming(false)
    }
  }

  if (!chunk) return <div><Nav /><p>Loading…</p></div>

  return (
    <div>
      <Nav />

      <form onSubmit={saveMeta} style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>{chunk.text}</h1>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Language:{' '}
            <select value={editLang} onChange={e => setEditLang(e.target.value)}>
              {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block' }}>Text:</label>
          <textarea
            rows={2}
            cols={60}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Notes:{' '}
            <input
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              style={{ width: '30rem' }}
              placeholder="optional"
            />
          </label>
        </div>
        <button type="submit">Save</button>
        {metaSaved && <span style={{ marginLeft: '0.5em', color: 'green' }}>Saved</span>}
      </form>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Translations</h2>
        {chunk.translations.length === 0 && <p style={{ color: '#aaa' }}>No translations yet.</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem' }}>
          {chunk.translations.map(t => (
            <li key={t.id} style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ minWidth: '2rem', color: '#888', fontSize: '0.85em' }}>{t.lang}:</span>
              {editTransId === t.id ? (
                <>
                  <input
                    value={editTransText}
                    onChange={e => setEditTransText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTranslation(t.id); if (e.key === 'Escape') setEditTransId(null) }}
                    autoFocus
                    style={{ width: '30rem' }}
                  />
                  <button onClick={() => saveTranslation(t.id)}>Save</button>
                  <button onClick={() => setEditTransId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span>{t.text}</span>
                  <button onClick={() => { setEditTransId(t.id); setEditTransText(t.text) }} style={{ fontSize: '0.75em' }}>edit</button>
                  <button onClick={() => deleteTranslation(t.id)} style={{ fontSize: '0.75em', color: '#c00' }}>×</button>
                </>
              )}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={newTransLang} onChange={e => setNewTransLang(e.target.value)}>
            {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input
            value={newTransText}
            onChange={e => setNewTransText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTranslation() }}
            placeholder="Add translation…"
            style={{ width: '24rem' }}
          />
          <button onClick={addTranslation} disabled={!newTransText.trim()}>Add</button>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Word links</h2>
        {chunk.links.length === 0 && <p style={{ color: '#aaa' }}>No links.</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem' }}>
          {chunk.links.map(l => (
            <li key={l.id} style={{ marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {l.pair_id ? (
                <Link to={`/pairs/${l.pair_id}`} style={{ fontStyle: 'italic' }}>
                  {l.pair_label ?? l.lexeme_form ?? '?'}
                </Link>
              ) : l.entry_id ? (
                <Link to={l.lexeme_pos === 'noun' ? `/nouns/${l.entry_id}` : `/words/${l.entry_id}`} style={{ fontStyle: 'italic' }}>
                  {l.lexeme_form ?? '?'}
                </Link>
              ) : (
                <span style={{ fontStyle: 'italic' }}>{l.lexeme_form ?? '?'}</span>
              )}
              <span style={{ color: '#888', fontSize: '0.85em' }}>({l.lexeme_pos})</span>
              <button onClick={() => removeLink(l.id)} style={{ fontSize: '0.75em', color: '#c00' }}>×</button>
            </li>
          ))}
        </ul>
        <button onClick={suggestLinks}>Suggest links from text</button>
        {showSuggest && suggestions.length === 0 && (
          <span style={{ marginLeft: '0.5em', color: '#aaa' }}>No new suggestions.</span>
        )}
        {suggestions.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
            {suggestions.map(s => (
              <li key={s.lexeme_id} style={{ marginBottom: '0.3rem' }}>
                <button onClick={() => addLink(s.lexeme_id)} style={{ marginRight: '0.5rem' }}>+</button>
                <span style={{ fontStyle: 'italic' }}>{s.lexeme_form}</span>
                {' '}({s.lexeme_pos}) — matched "{s.matched_form}"
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Tags</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {chunk.tags.length === 0 && <span style={{ color: '#aaa' }}>No tags.</span>}
          {chunk.tags.map(t => (
            <TagChip key={t.id} tag={t} onRemove={() => removeTag(t.id)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
          <select value={addTagId} onChange={e => setAddTagId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">— existing tag —</option>
            {allTags.filter(t => !chunk.tags.some(ct => ct.id === t.id)).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button onClick={addTag} disabled={addTagId === ''}>Add</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createAndAddTag() }}
            placeholder="New tag name…"
            style={{ width: '14rem' }}
          />
          <button onClick={createAndAddTag} disabled={!newTagName.trim()}>Create & add</button>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        {deleteError && <p style={{ color: 'red' }}>{deleteError}</p>}
        {!confirming ? (
          <button onClick={() => setConfirming(true)} style={{ color: 'red' }}>Delete chunk</button>
        ) : (
          <>
            <span>Delete this chunk? </span>
            <button onClick={handleDelete} style={{ color: 'red' }}>Yes, delete</button>
            {' '}
            <button onClick={() => setConfirming(false)}>Cancel</button>
          </>
        )}
      </section>
    </div>
  )
}

import { useState } from 'react'
import { api } from '../api/client'
import { VerbformenCandidate } from '../types'

interface TranslationItem { id: number; text: string }

export function TranslationRow({ lang, items, searchWord, onAdd, onUpdate, onDelete }: {
  lang: string
  items: TranslationItem[]
  searchWord?: string
  onAdd: (text: string) => void
  onUpdate: (id: number, text: string) => void
  onDelete: (id: number) => void
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [candidates, setCandidates] = useState<VerbformenCandidate[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)

  function openAdd() {
    setAdding(true)
    setNewText('')
    setCandidates([])
    if (lang === 'de' && searchWord) {
      setCandidatesLoading(true)
      api.get<VerbformenCandidate[]>(`/verbformen-fetch?word=${encodeURIComponent(searchWord)}`)
        .then(results => setCandidates(results))
        .catch(() => {})
        .finally(() => setCandidatesLoading(false))
    }
  }

  function cancelAdd() {
    setAdding(false)
    setNewText('')
    setCandidates([])
  }

  function commitAdd() {
    const t = newText.trim()
    if (t) { onAdd(t); setNewText('') }
    setAdding(false)
    setCandidates([])
  }

  function commitEdit(id: number) {
    const t = editText.trim()
    if (t) onUpdate(id, t)
    setEditingId(null)
  }

  return (
    <div style={{ fontSize: '0.85em', marginBottom: '0.3rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.25rem 0.4rem' }}>
        <span className="text-muted" style={{ minWidth: '1.5rem' }}>{lang}</span>
        {items.map(item => (
          editingId === item.id ? (
            <span key={item.id} style={{ display: 'inline-flex', gap: '0.25rem' }}>
              <input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(item.id); if (e.key === 'Escape') setEditingId(null) }}
                style={{ width: '16rem', maxWidth: '100%' }}
                autoFocus
              />
              <button onClick={() => commitEdit(item.id)}>Save</button>
              <button onClick={() => setEditingId(null)}>Cancel</button>
            </span>
          ) : (
            <span key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              <span>{item.text}</span>
              <button onClick={() => { setEditingId(item.id); setEditText(item.text) }}
                style={{ fontSize: '0.75em', padding: '0 0.3em' }}>edit</button>
              <button onClick={() => onDelete(item.id)}
                className="text-danger" style={{ fontSize: '0.75em', padding: '0 0.3em' }}>×</button>
            </span>
          )
        ))}
        {adding ? (
          <span style={{ display: 'inline-flex', gap: '0.25rem' }}>
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') cancelAdd() }}
              style={{ width: '16rem', maxWidth: '100%' }}
              autoFocus
            />
            <button onClick={commitAdd}>Add</button>
            <button onClick={cancelAdd}>Cancel</button>
          </span>
        ) : (
          <button onClick={openAdd}
            className="text-secondary" style={{ fontSize: '0.75em', padding: '0 0.3em' }}>+</button>
        )}
      </div>

      {adding && (candidatesLoading || candidates.length > 0) && (
        <div style={{ marginLeft: '2rem', marginTop: '0.2rem' }}>
          {candidatesLoading && <span className="text-muted">Fetching…</span>}
          {[...candidates].sort((a, b) => {
            const order = ['A1','A2','B1','B2','C1','C2']
            return (a.cefr ? order.indexOf(a.cefr) : order.length) - (b.cefr ? order.indexOf(b.cefr) : order.length)
          }).map((c, i) => (
            <button
              key={i}
              onClick={() => setNewText(c.german)}
              style={{
                marginRight: '0.4rem',
                marginBottom: '0.2rem',
                background: newText === c.german ? '#dbeafe' : '#f3f4f6',
                color: '#111',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                padding: '0.1em 0.45em',
                fontSize: '0.9em',
                cursor: 'pointer',
              }}
            >
              {c.article && <span className="text-muted" style={{ marginRight: '0.2em' }}>{c.article}</span>}
              {c.german}
              {c.uk_gloss && <span className="text-muted" style={{ marginLeft: '0.35em', fontSize: '0.8em' }}>· {c.uk_gloss}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

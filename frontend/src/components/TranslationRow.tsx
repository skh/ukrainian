import { useState } from 'react'

interface TranslationItem { id: number; text: string }

export function TranslationRow({ lang, items, onAdd, onUpdate, onDelete }: {
  lang: string
  items: TranslationItem[]
  onAdd: (text: string) => void
  onUpdate: (id: number, text: string) => void
  onDelete: (id: number) => void
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')

  function commitAdd() {
    const t = newText.trim()
    if (t) { onAdd(t); setNewText('') }
    setAdding(false)
  }

  function commitEdit(id: number) {
    const t = editText.trim()
    if (t) onUpdate(id, t)
    setEditingId(null)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.25rem 0.4rem', fontSize: '0.85em', marginBottom: '0.15rem' }}>
      <span style={{ color: '#888', minWidth: '1.5rem' }}>{lang}</span>
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
              style={{ fontSize: '0.75em', padding: '0 0.3em', color: '#c00' }}>×</button>
          </span>
        )
      ))}
      {adding ? (
        <span style={{ display: 'inline-flex', gap: '0.25rem' }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { setAdding(false); setNewText('') } }}
            style={{ width: '16rem', maxWidth: '100%' }}
            autoFocus
          />
          <button onClick={commitAdd}>Add</button>
          <button onClick={() => { setAdding(false); setNewText('') }}>Cancel</button>
        </span>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ fontSize: '0.75em', padding: '0 0.3em', color: '#666' }}>+</button>
      )}
    </div>
  )
}

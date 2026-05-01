import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { RefPair } from '../types'
import { Nav } from '../components/Nav'
import { aspectBg } from '../utils/theme'
import { stripAccent } from '../utils/forms'

type EditState = { ipf: string; pf: string; source: string; notes: string }

const EMPTY: EditState = { ipf: '', pf: '', source: '', notes: '' }

export default function RefPairsPage() {
  const [pairs, setPairs] = useState<RefPair[]>([])
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<EditState>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditState>(EMPTY)

  async function load() {
    setPairs(await api.get<RefPair[]>('/ref-pairs'))
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!form.ipf.trim() && !form.pf.trim()) return
    await api.post('/ref-pairs', {
      ipf:    form.ipf.trim() || null,
      pf:     form.pf.trim() || null,
      source: form.source.trim() || null,
      notes:  form.notes.trim() || null,
    })
    setForm(EMPTY)
    setAdding(false)
    load()
  }

  async function handleSaveEdit(id: number) {
    await api.put(`/ref-pairs/${id}`, {
      ipf:    editForm.ipf.trim() || null,
      pf:     editForm.pf.trim() || null,
      source: editForm.source.trim() || null,
      notes:  editForm.notes.trim() || null,
    })
    setEditId(null)
    load()
  }

  async function handleDelete(id: number) {
    await api.delete(`/ref-pairs/${id}`)
    load()
  }

  function startEdit(p: RefPair) {
    setEditId(p.id)
    setEditForm({ ipf: p.ipf ?? '', pf: p.pf ?? '', source: p.source ?? '', notes: p.notes ?? '' })
  }

  const q = stripAccent(filter.toLowerCase())
  const visible = q
    ? pairs.filter(p =>
        [p.ipf, p.pf, p.source, p.notes].some(f => f && stripAccent(f.toLowerCase()).includes(q))
      )
    : pairs

  // Group by source
  const groups = new Map<string, RefPair[]>()
  for (const p of visible) {
    const key = p.source ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const inputStyle: React.CSSProperties = { padding: '0.2em 0.4em', fontSize: '0.9em', width: '100%' }

  return (
    <div>
      <Nav />
      <h1>Reference pairs</h1>
      <p style={{ color: '#888', fontSize: '0.9em', marginTop: '-0.5rem' }}>
        Aspect pairs from textbook sources — strings only, no database links.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter..."
          style={{ padding: '0.3em 0.5em' }}
        />
        <button onClick={() => { setAdding(true); setForm(EMPTY) }}>+ Add</button>
      </div>

      {adding && (
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: '0.4rem', alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '0.75em', color: '#888', marginBottom: '2px' }}>ipf</div>
            <input style={inputStyle} value={form.ipf} onChange={e => setForm(f => ({ ...f, ipf: e.target.value }))} placeholder="imperfective" />
          </div>
          <div>
            <div style={{ fontSize: '0.75em', color: '#888', marginBottom: '2px' }}>pf</div>
            <input style={inputStyle} value={form.pf} onChange={e => setForm(f => ({ ...f, pf: e.target.value }))} placeholder="perfective" />
          </div>
          <div>
            <div style={{ fontSize: '0.75em', color: '#888', marginBottom: '2px' }}>source</div>
            <input style={inputStyle} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Pugh p.45" />
          </div>
          <div>
            <div style={{ fontSize: '0.75em', color: '#888', marginBottom: '2px' }}>notes</div>
            <input style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="grammatical notes" />
          </div>
          <button onClick={handleAdd}>Save</button>
          <button onClick={() => setAdding(false)}>Cancel</button>
        </div>
      )}

      {groups.size === 0 && <p style={{ color: '#aaa' }}>No entries.</p>}

      {[...groups.entries()].map(([source, rows]) => (
        <div key={source} style={{ marginBottom: '1.5rem' }}>
          {source && (
            <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#555', marginBottom: '0.35rem', borderBottom: '1px solid #eee', paddingBottom: '0.2rem' }}>
              {source}
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: '0.8em', color: '#aaa' }}>
                <th style={{ textAlign: 'left', paddingBottom: '0.2rem', width: '22%' }}>ipf</th>
                <th style={{ textAlign: 'left', paddingBottom: '0.2rem', width: '22%' }}>pf</th>
                {!source && <th style={{ textAlign: 'left', paddingBottom: '0.2rem', width: '18%' }}>source</th>}
                <th style={{ textAlign: 'left', paddingBottom: '0.2rem' }}>notes</th>
                <th style={{ width: '6rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #f3f3f3' }}>
                  {editId === p.id ? (
                    <>
                      <td style={{ padding: '0.3rem 0.3rem 0.3rem 0' }}>
                        <input style={inputStyle} value={editForm.ipf} onChange={e => setEditForm(f => ({ ...f, ipf: e.target.value }))} />
                      </td>
                      <td style={{ padding: '0.3rem' }}>
                        <input style={inputStyle} value={editForm.pf} onChange={e => setEditForm(f => ({ ...f, pf: e.target.value }))} />
                      </td>
                      {!source && (
                        <td style={{ padding: '0.3rem' }}>
                          <input style={inputStyle} value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} />
                        </td>
                      )}
                      <td style={{ padding: '0.3rem' }}>
                        <input style={inputStyle} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                      </td>
                      <td style={{ padding: '0.3rem', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleSaveEdit(p.id)} style={{ marginRight: '0.3rem' }}>Save</button>
                        <button onClick={() => setEditId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '0.3rem 0.3rem 0.3rem 0' }}>
                        {p.ipf && <span style={{ background: aspectBg.ipf, padding: '0.1em 0.35em', borderRadius: '3px' }}>{p.ipf}</span>}
                      </td>
                      <td style={{ padding: '0.3rem' }}>
                        {p.pf && <span style={{ background: aspectBg.pf, padding: '0.1em 0.35em', borderRadius: '3px' }}>{p.pf}</span>}
                      </td>
                      {!source && <td style={{ padding: '0.3rem', color: '#888', fontSize: '0.85em' }}>{p.source}</td>}
                      <td style={{ padding: '0.3rem', color: '#666', fontSize: '0.9em' }}>{p.notes}</td>
                      <td style={{ padding: '0.3rem', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(p)} style={{ marginRight: '0.3rem', fontSize: '0.8em' }}>Edit</button>
                        <button onClick={() => handleDelete(p.id)} style={{ fontSize: '0.8em', color: '#c00' }}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

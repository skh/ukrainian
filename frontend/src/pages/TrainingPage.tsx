import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import {
  Pool, getPools, createPool, renamePool, deletePool, getPoolItemCount,
} from '../training/db'

export default function TrainingPage() {
  const navigate = useNavigate()
  const [pools, setPools] = useState<Pool[]>([])
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  async function load() {
    const ps = await getPools()
    setPools(ps.sort((a, b) => a.createdAt - b.createdAt))
    const entries = await Promise.all(ps.map(async p => [p.id, await getPoolItemCount(p.id)] as const))
    setCounts(new Map(entries))
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    await createPool(name)
    setNewName('')
    load()
  }

  async function handleRename(id: string) {
    const name = renameVal.trim()
    if (name) await renamePool(id, name)
    setRenamingId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pool and all its items?')) return
    await deletePool(id)
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    load()
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function startSession() {
    if (selectedIds.size === 0) return
    navigate(`/training/session?pools=${[...selectedIds].join(',')}`)
  }

  return (
    <div>
      <Nav />
      <h1>Training pools</h1>

      {pools.length === 0 ? (
        <p style={{ color: '#aaa' }}>No pools yet. Create one below.</p>
      ) : (
        <table style={{ marginBottom: '1.5rem' }}>
          <tbody>
            {pools.map(p => (
              <tr key={p.id}>
                <td style={{ paddingRight: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                </td>
                <td style={{ paddingRight: '1rem' }}>
                  {renamingId === p.id ? (
                    <span>
                      <input
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') setRenamingId(null) }}
                        autoFocus
                        style={{ fontSize: '1em' }}
                      />
                      {' '}
                      <button onClick={() => handleRename(p.id)}>Save</button>
                      {' '}
                      <button onClick={() => setRenamingId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <Link to={`/training/pools/${p.id}`} style={{ fontWeight: 500 }}>{p.name}</Link>
                  )}
                </td>
                <td style={{ color: '#888', fontSize: '0.85em', paddingRight: '1rem' }}>
                  {counts.get(p.id) ?? 0} items
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => { setRenamingId(p.id); setRenameVal(p.name) }}
                    style={{ fontSize: '0.8em', marginRight: '0.4rem' }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ fontSize: '0.8em', color: '#c00' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedIds.size > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={startSession}
            style={{ padding: '0.4em 1.2em', fontSize: '1.05em', fontWeight: 600, background: '#111', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Start training ({selectedIds.size} pool{selectedIds.size > 1 ? 's' : ''})
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          placeholder="New pool name..."
          style={{ padding: '0.3em 0.5em' }}
        />
        <button onClick={handleCreate}>Create pool</button>
      </div>
    </div>
  )
}

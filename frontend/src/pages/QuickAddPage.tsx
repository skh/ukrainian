import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { GorohCandidate } from '../types'
import { Nav } from '../components/Nav'
import { CandidateCard, entryPath } from '../components/GorohLookup'

export default function QuickAddPage() {
  const [word, setWord] = useState('')
  const [candidates, setCandidates] = useState<GorohCandidate[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [savedEntries, setSavedEntries] = useState<Array<{ id: number; pos: string; accented: string }>>([])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!word.trim()) return
    setLoading(true)
    setFetchError('')
    setCandidates(null)
    setSelectedId(null)
    setSavedEntries([])
    try {
      const results = await api.get<GorohCandidate[]>(`/goroh-fetch?word=${encodeURIComponent(word.trim())}`)
      setCandidates(results)
    } catch (err) {
      setFetchError(String(err))
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(id: number, pos: string) {
    const accented = candidates?.find(c => c.goroh_id === selectedId)?.accented ?? ''
    setSavedEntries(prev => [...prev, { id, pos, accented }])
    setCandidates(prev => prev?.map(c =>
      c.goroh_id === selectedId ? { ...c, already_exists: true, existing_id: id } : c
    ) ?? null)
    setSelectedId(null)
  }

  const allExist = candidates !== null && candidates.length > 0 && candidates.every(c => c.already_exists)
  const noResults = candidates !== null && candidates.length === 0

  return (
    <div>
      <Nav />
      <h1>Quick add</h1>

      <form onSubmit={search} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          value={word}
          onChange={e => setWord(e.target.value)}
          placeholder="Type any form of a Ukrainian word…"
          style={{ width: '20rem', maxWidth: '100%' }}
          autoFocus
        />
        <button type="submit" disabled={loading || !word.trim()}>
          {loading ? 'Fetching…' : 'Look up'}
        </button>
      </form>

      {savedEntries.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {savedEntries.map(e => (
            <p key={e.id} style={{ margin: '0.2rem 0' }}>
              <span style={{ color: 'green' }}>✓</span>{' '}
              <Link to={entryPath(e.pos, e.id)}>{e.accented}</Link> added
            </p>
          ))}
        </div>
      )}

      {fetchError && <p className="text-danger">{fetchError}</p>}

      {(noResults || allExist) && !fetchError && (
        <p className="text-muted">Nothing to add — all candidates are already in your dictionary.</p>
      )}

      {candidates && candidates.map(c => (
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
  )
}

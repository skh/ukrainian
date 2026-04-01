import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { Nav } from '../components/Nav'

type IndeclinablePos = 'conjunction' | 'preposition' | 'adverb'

const POS_LABELS: Record<IndeclinablePos, string> = {
  conjunction: 'Conjunction (сполучник)',
  preposition: 'Preposition (прийменник)',
  adverb: 'Adverb (прислівник)',
}

export default function AddWordPage() {
  const navigate = useNavigate()
  const [pos, setPos] = useState<IndeclinablePos>('conjunction')
  const [accented, setAccented] = useState('')
  const [message, setMessage] = useState('')
  const [conflictId, setConflictId] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setConflictId(null)
    const acc = accented.trim()
    if (!acc) { setMessage('Accented form is required'); return }
    try {
      const entry = await api.post<{ id: number }>('/words', { pos, accented: acc })
      navigate(`/words/${entry.id}`)
    } catch (err: unknown) {
      const msg = String(err)
      if (msg.includes('409')) {
        const match = msg.match(/"id":\s*(\d+)/)
        setConflictId(match ? Number(match[1]) : null)
      } else {
        setMessage(msg)
      }
    }
  }

  return (
    <div>
      <Nav />
      <h1>Add indeclinable word</h1>

      {conflictId !== null && (
        <p style={{ color: 'orange' }}>
          This entry already exists.{' '}
          <Link to={`/nouns/${conflictId}`}>Go to entry page</Link>
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          {(Object.keys(POS_LABELS) as IndeclinablePos[]).map(p => (
            <label key={p} style={{ display: 'block', marginBottom: '0.3rem' }}>
              <input
                type="radio"
                name="pos"
                value={p}
                checked={pos === p}
                onChange={() => setPos(p)}
              />{' '}
              {POS_LABELS[p]}
            </label>
          ))}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>
            Accented form:{' '}
            <input
              value={accented}
              onChange={e => setAccented(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e as unknown as React.FormEvent) }}
              placeholder="e.g. але́, про, ду́же"
              style={{ width: '16rem' }}
              autoFocus
            />
          </label>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button type="submit" className="btn-primary">Save</button>
          {message && <span style={{ marginLeft: '0.5em', color: 'red' }}>{message}</span>}
        </div>
      </form>
    </div>
  )
}

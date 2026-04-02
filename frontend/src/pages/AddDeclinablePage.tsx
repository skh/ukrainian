import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { Nav } from '../components/Nav'
import { parseDeclinable } from '../utils/adjectiveParser'
import { Entry } from '../types'

type DeclinablePos = 'adjective' | 'pronoun' | 'numeral'

const POS_UA: Record<DeclinablePos, string> = {
  adjective: 'Adjective (прикметник)',
  pronoun:   'Pronoun (займенник)',
  numeral:   'Numeral (числівник)',
}

interface Props {
  pos: DeclinablePos
}

export default function AddDeclinablePage({ pos }: Props) {
  const navigate = useNavigate()
  const plural = `${pos}s`

  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')
  const [message, setMessage] = useState('')
  const [conflictId, setConflictId] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setParseError('')
    setConflictId(null)

    const text = pasteText.trim()
    if (!text) { setParseError('Paste goroh text first.'); return }

    const parsed = parseDeclinable(text)
    if (!parsed) { setParseError('Could not parse goroh text.'); return }
    if (parsed.pos !== pos) { setParseError(`Expected ${pos}, got ${parsed.pos}.`); return }

    try {
      const entry = await api.post<Entry>(`/${plural}`, { accented: parsed.accented })
      if (parsed.forms.length > 0) {
        await api.put(`/${plural}/${entry.id}/forms`, parsed.forms)
      }
      navigate(`/${plural}/${entry.id}`)
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

  async function handleSubmitWithoutForms() {
    setMessage('')
    setParseError('')
    setConflictId(null)

    // Prompt for accented form directly
    const accented = prompt('Enter accented form:')
    if (!accented?.trim()) return

    try {
      const entry = await api.post<Entry>(`/${plural}`, { accented: accented.trim() })
      navigate(`/${plural}/${entry.id}`)
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
      <h1>Add {POS_UA[pos]}</h1>

      {conflictId !== null && (
        <p style={{ color: 'orange' }}>
          This entry already exists.{' '}
          <Link to={`/${plural}/${conflictId}`}>Go to entry page</Link>
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <p style={{ color: '#666', fontSize: '0.9em' }}>
          Paste the full page text for a {pos} from goroh.pp.ua:
        </p>
        <textarea
          rows={10}
          cols={60}
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder={`Paste goroh.pp.ua text for a ${pos}…`}
          style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
        />
        <br />
        {parseError && <p style={{ color: 'red' }}>{parseError}</p>}
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
          <button type="submit">Add {pos}</button>
          <button type="button" onClick={handleSubmitWithoutForms} style={{ color: '#888' }}>
            Add without forms
          </button>
        </div>
        {message && <p style={{ color: 'red' }}>{message}</p>}
      </form>
    </div>
  )
}

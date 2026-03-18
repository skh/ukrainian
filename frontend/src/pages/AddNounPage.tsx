import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { parseNoun, ParsedNoun } from '../utils/nounParser'
import { Nav } from '../components/Nav'
import { CASE_LABELS, CASES } from '../utils/nouns'

export default function AddNounPage() {
  const navigate = useNavigate()
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState<ParsedNoun | null>(null)
  const [parseError, setParseError] = useState('')
  const [manualAccented, setManualAccented] = useState('')
  const [manualGender, setManualGender] = useState<'m' | 'f' | 'n' | ''>('')
  const [manualNumberType, setManualNumberType] = useState<'sg' | 'pl' | 'both'>('both')
  const [message, setMessage] = useState('')
  const [conflictId, setConflictId] = useState<number | null>(null)

  function handleParse() {
    setParseError('')
    setParsed(null)
    const result = parseNoun(pasteText)
    if (!result) {
      setParseError('Could not parse. Check that the text is a noun entry from goroh.')
      return
    }
    setParsed(result)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (parsed) {
        const entry = await api.post<{ id: number }>('/nouns', {
          lemma: parsed.accented.replace(/\u0301/g, ''),
          accented: parsed.accented,
          gender: parsed.gender,
          number_type: parsed.number_type,
        })
        if (parsed.forms.length > 0) {
          await api.put(`/nouns/${entry.id}/forms`, parsed.forms)
        }
        navigate(`/nouns/${entry.id}`)
      } else {
        const acc = manualAccented.trim()
        if (!acc) { setMessage('Accented form is required'); return }
        const entry = await api.post<{ id: number }>('/nouns', {
          lemma: acc.replace(/\u0301/g, ''),
          accented: acc,
          gender: manualGender || null,
          number_type: manualNumberType,
        })
        navigate(`/nouns/${entry.id}`)
      }
    } catch (err: unknown) {
      const msg = String(err)
      if (msg.includes('409')) {
        // extract id from detail JSON if possible
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
      <h1>Add noun</h1>
      {conflictId !== null && (
        <p style={{ color: 'orange' }}>
          This noun already exists.{' '}
          <Link to={`/nouns/${conflictId}`}>Go to noun page</Link>
        </p>
      )}

      <h2>Paste from goroh</h2>
      <textarea
        rows={12}
        cols={50}
        value={pasteText}
        onChange={e => setPasteText(e.target.value)}
        placeholder="Paste noun paradigm from goroh.pp.ua..."
        style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
      />
      <br />
      <button onClick={handleParse}>Parse</button>
      {parseError && <span style={{ color: 'red', marginLeft: '0.5em' }}>{parseError}</span>}

      {parsed && (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h3>Parsed: {parsed.accented}</h3>
          <p>
            <strong>Gender:</strong> {parsed.gender ?? '(none — pluralia tantum)'}
            {' '}
            <strong>Number type:</strong> {parsed.number_type}
          </p>
          {parsed.forms.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  {(parsed.number_type === 'sg' || parsed.number_type === 'both') && <th>Singular</th>}
                  {(parsed.number_type === 'pl' || parsed.number_type === 'both') && <th>Plural</th>}
                </tr>
              </thead>
              <tbody>
                {CASES.map(c => {
                  const sg = parsed.forms.find(f => f.tags === `${c},sg`)?.form
                  const pl = parsed.forms.find(f => f.tags === `${c},pl`)?.form
                  return (
                    <tr key={c}>
                      <td>{CASE_LABELS[c]}</td>
                      {(parsed.number_type === 'sg' || parsed.number_type === 'both') && (
                        <td>{sg ?? '—'}</td>
                      )}
                      {(parsed.number_type === 'pl' || parsed.number_type === 'both') && (
                        <td>{pl ?? '—'}</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <button type="submit">Save noun</button>
            {message && <span style={{ marginLeft: '0.5em', color: 'red' }}>{message}</span>}
          </form>
        </div>
      )}

      {!parsed && (
        <>
          <hr style={{ margin: '2rem 0' }} />
          <h2>Or add manually (no forms)</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label>
                Accented form:{' '}
                <input
                  value={manualAccented}
                  onChange={e => setManualAccented(e.target.value)}
                  placeholder="e.g. мо́ва"
                />
              </label>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <label>
                Gender:{' '}
                <select value={manualGender} onChange={e => setManualGender(e.target.value as 'm' | 'f' | 'n' | '')}>
                  <option value="">— (none, pluralia tantum)</option>
                  <option value="m">m — чоловічий</option>
                  <option value="f">f — жіночий</option>
                  <option value="n">n — середній</option>
                </select>
              </label>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <label>
                Number type:{' '}
                <select value={manualNumberType} onChange={e => setManualNumberType(e.target.value as 'sg' | 'pl' | 'both')}>
                  <option value="both">both</option>
                  <option value="sg">sg (singularia tantum)</option>
                  <option value="pl">pl (pluralia tantum)</option>
                </select>
              </label>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button type="submit">Save noun</button>
              {message && <span style={{ marginLeft: '0.5em', color: 'red' }}>{message}</span>}
            </div>
          </form>
        </>
      )}
    </div>
  )
}

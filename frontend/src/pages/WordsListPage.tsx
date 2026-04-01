import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Lexeme, LexemeTranslation } from '../types'
import { Nav } from '../components/Nav'
import { genderBg } from '../utils/nouns'
import { aspectBg } from '../utils/theme'
import { stripAccent } from '../utils/forms'

const posBg: Record<string, string> = {
  noun:        '#d1fae5',
  adjective:   '#e9d5ff',
  adverb:      '#fce7f3',
  conjunction: '#fef9c3',
  numeral:     '#ffedd5',
  preposition: '#e0f2fe',
  pronoun:     '#fae8ff',
  pair:        '#ffffff',
}

function entryPath(e: Lexeme) {
  if (e.pos === 'pair') return e.pair_id ? `/pairs/${e.pair_id}` : '#'
  return e.pos === 'noun' ? `/nouns/${e.id}` : `/words/${e.id}`
}

function entryLabel(e: Lexeme) {
  if (e.pos === 'pair' && e.pair) {
    const { ipf_verb, pf_verb } = e.pair
    return (
      <>
        {ipf_verb && <span style={{ background: aspectBg.ipf, padding: '0.1em 0.35em', borderRadius: '3px', marginRight: '0.15em' }}>{ipf_verb.accented}</span>}
        {pf_verb && <span style={{ background: aspectBg.pf, padding: '0.1em 0.35em', borderRadius: '3px' }}>{pf_verb.accented}</span>}
      </>
    )
  }
  return e.accented
}

function entryText(e: Lexeme): string {
  if (e.pos === 'pair' && e.pair) {
    return [e.pair.ipf_verb?.accented, e.pair.pf_verb?.accented].filter(Boolean).join(' ')
  }
  return e.accented
}

export default function WordsListPage() {
  const [entries, setEntries] = useState<Lexeme[]>([])
  const [deByLexeme, setDeByLexeme] = useState<Map<number, string>>(new Map())
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    Promise.all([
      api.get<Lexeme[]>('/words'),
      api.get<LexemeTranslation[]>('/lexeme-translations'),
    ]).then(([es, trs]) => {
      setEntries(es)
      setDeByLexeme(new Map(
        trs.filter(t => t.lang === 'de').map(t => [t.lexeme_id, t.text])
      ))
    })
  }, [])

  const q = stripAccent(filter.toLowerCase())
  const filtered = entries
    .filter(e => !q || stripAccent(entryText(e)).toLowerCase().includes(q))
    .sort((a, b) => stripAccent(entryText(a)).localeCompare(stripAccent(entryText(b)), 'uk'))

  const totalPages = Math.ceil(filtered.length / pageSize)
  const clampedPage = Math.min(page, Math.max(0, totalPages - 1))
  const paged = filtered.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)

  return (
    <div>
      <Nav />
      <h1>Words</h1>
      <Link to="/nouns/add">Add noun</Link>
      {' | '}
      <Link to="/words/add">Add word</Link>
      <br /><br />
      <input
        value={filter}
        onChange={e => { setFilter(e.target.value); setPage(0) }}
        placeholder="Filter..."
      />
      <br /><br />
      {filtered.length === 0 ? (
        <p style={{ color: '#aaa' }}>No entries yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="col-mobile-hide"></th>
              <th>Word</th>
              <th>POS</th>
              <th>Info</th>
              <th>de</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((e, i) => (
              <tr key={e.id}>
                <td className="col-mobile-hide" style={{ color: '#bbb', fontSize: '0.8em', textAlign: 'right', paddingRight: '0.5em' }}>{clampedPage * pageSize + i + 1}</td>
                <td><Link to={entryPath(e)}>{entryLabel(e)}</Link></td>
                <td>
                  {e.pos !== 'pair' && (
                    <span style={{
                      background: posBg[e.pos] ?? '#eee',
                      padding: '0.1em 0.45em',
                      borderRadius: '3px',
                      fontSize: '0.82em',
                    }}>
                      {e.pos}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: '0.85em', color: '#555' }}>
                  {e.pos === 'noun' && (
                    <>
                      {e.gender && (
                        <span style={{
                          background: genderBg[e.gender],
                          padding: '0.1em 0.35em',
                          borderRadius: '3px',
                          marginRight: '0.4em',
                        }}>
                          {e.gender}
                        </span>
                      )}
                      {e.number_type && e.number_type !== 'both' && (
                        <span style={{ color: '#888' }}>{e.number_type}</span>
                      )}
                    </>
                  )}
                </td>
                <td style={{ fontSize: '0.85em', color: '#555' }}>{deByLexeme.get(e.id) ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button onClick={() => setPage(0)} disabled={clampedPage === 0}>«</button>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={clampedPage === 0}>‹</button>
          <span style={{ fontSize: '0.9em' }}>{clampedPage + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={clampedPage === totalPages - 1}>›</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={clampedPage === totalPages - 1}>»</button>
          <span style={{ marginLeft: '0.5rem' }}>
            {[10, 20, 50, 100].map(n => (
              <button
                key={n}
                onClick={() => { setPageSize(n); setPage(0) }}
                style={{ marginRight: '0.25rem', fontWeight: pageSize === n ? 'bold' : 'normal' }}
              >
                {n}
              </button>
            ))}
          </span>
        </div>
      )}
    </div>
  )
}

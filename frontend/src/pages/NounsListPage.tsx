import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Entry, LexemeTranslation } from '../types'
import { Nav } from '../components/Nav'
import { genderBg } from '../utils/nouns'
import { stripAccent } from '../utils/forms'

export default function NounsListPage() {
  const [nouns, setNouns] = useState<Entry[]>([])
  const [deByLexeme, setDeByLexeme] = useState<Map<number, string>>(new Map())
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    Promise.all([
      api.get<Entry[]>('/nouns'),
      api.get<LexemeTranslation[]>('/lexeme-translations'),
    ]).then(([ns, trs]) => {
      setNouns(ns)
      setDeByLexeme(new Map(
        trs.filter(t => t.lang === 'de').map(t => [t.lexeme_id, t.text])
      ))
    })
  }, [])

  const q = stripAccent(filter.toLowerCase())
  const filtered = nouns
    .filter(n => !q || stripAccent(n.accented).toLowerCase().includes(q))
    .sort((a, b) => stripAccent(a.accented).localeCompare(stripAccent(b.accented), 'uk'))

  const totalPages = Math.ceil(filtered.length / pageSize)
  const clampedPage = Math.min(page, Math.max(0, totalPages - 1))
  const paged = filtered.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)

  return (
    <div>
      <Nav />
      <h1>Nouns</h1>
      <Link to="/nouns/add">Add noun</Link>
      <br /><br />
      <input
        value={filter}
        onChange={e => { setFilter(e.target.value); setPage(0) }}
        placeholder="Filter..."
      />
      <br /><br />
      {filtered.length === 0 ? (
        <p style={{ color: '#aaa' }}>No nouns yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="col-mobile-hide"></th>
              <th>Noun</th>
              <th>Gender</th>
              <th>Number</th>
              <th>de</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((n, i) => (
              <tr key={n.id}>
                <td className="col-mobile-hide" style={{ color: '#bbb', fontSize: '0.8em', textAlign: 'right', paddingRight: '0.5em' }}>{clampedPage * pageSize + i + 1}</td>
                <td>
                  <Link to={`/nouns/${n.id}`}>{n.accented}</Link>
                </td>
                <td>
                  {n.gender ? (
                    <span style={{
                      background: genderBg[n.gender],
                      padding: '0.1em 0.4em',
                      borderRadius: '3px',
                      fontSize: '0.85em',
                    }}>
                      {n.gender}
                    </span>
                  ) : (
                    <span style={{ color: '#aaa', fontSize: '0.85em' }}>—</span>
                  )}
                </td>
                <td style={{ fontSize: '0.85em', color: '#666' }}>{n.number_type ?? ''}</td>
                <td style={{ fontSize: '0.85em', color: '#555' }}>{deByLexeme.get(n.id) ?? ''}</td>
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

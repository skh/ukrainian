import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Entry, LexemeTranslation } from '../types'
import { Nav } from '../components/Nav'
import { genderBg } from '../utils/nouns'
import { stripAccent } from '../utils/forms'

type DeclinablePos = 'adjective' | 'pronoun' | 'numeral'

const POS_TITLE: Record<DeclinablePos, string> = {
  adjective: 'Adjectives',
  pronoun:   'Pronouns',
  numeral:   'Numerals',
}

interface Props {
  pos: DeclinablePos
}

export default function DeclinablesListPage({ pos }: Props) {
  const plural = `${pos}s`
  const [items, setItems] = useState<Entry[]>([])
  const [deByLexeme, setDeByLexeme] = useState<Map<number, string>>(new Map())
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    Promise.all([
      api.get<Entry[]>(`/${plural}`),
      api.get<LexemeTranslation[]>('/lexeme-translations'),
    ]).then(([items, trs]) => {
      setItems(items)
      setDeByLexeme(new Map(
        trs.filter(t => t.lang === 'de').map(t => [t.lexeme_id, t.text])
      ))
    })
  }, [plural])

  const q = stripAccent(filter.toLowerCase())
  const filtered = items
    .filter(n => !q || stripAccent(n.accented).toLowerCase().includes(q))
    .sort((a, b) => stripAccent(a.accented).localeCompare(stripAccent(b.accented), 'uk'))

  const totalPages = Math.ceil(filtered.length / pageSize)
  const clampedPage = Math.min(page, Math.max(0, totalPages - 1))
  const paged = filtered.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)

  return (
    <div>
      <Nav />
      <h1>{POS_TITLE[pos]}</h1>
      <Link to={`/${plural}/add`}>Add {pos}</Link>
      <br /><br />
      <input
        value={filter}
        onChange={e => { setFilter(e.target.value); setPage(0) }}
        placeholder="Filter..."
      />
      <br /><br />
      {filtered.length === 0 ? (
        <p className="text-faint">No {plural} yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="col-mobile-hide"></th>
              <th>{POS_TITLE[pos].slice(0, -1)}</th>
              {pos === 'adjective' && <th>Gender</th>}
              <th>de</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((n, i) => (
              <tr key={n.id}>
                <td className="col-mobile-hide" style={{ color: '#bbb', fontSize: '0.8em', textAlign: 'right', paddingRight: '0.5em' }}>{clampedPage * pageSize + i + 1}</td>
                <td><Link to={`/${plural}/${n.id}`}>{n.accented}</Link></td>
                {pos === 'adjective' && (
                  <td>
                    {n.gender ? (
                      <span className="badge" style={{ background: genderBg[n.gender] }}>
                        {n.gender}
                      </span>
                    ) : (
                      <span className="text-faint" style={{ fontSize: '0.85em' }}>—</span>
                    )}
                  </td>
                )}
                <td className="text-dim" style={{ fontSize: '0.85em' }}>{deByLexeme.get(n.id) ?? ''}</td>
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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Entry, LexemeTranslation, LexemeFrequency } from '../types'
import { Nav } from '../components/Nav'
import { DictionaryTabs } from '../components/DictionaryTabs'
import { Pagination } from '../components/Pagination'
import { genderBg } from '../utils/nouns'
import { stripAccent } from '../utils/forms'
import { FREQ_CORPUS } from '../config'

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
  const [ipmByLexeme, setIpmByLexeme] = useState<Map<number, number>>(new Map())
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<'lemma' | 'ipm'>('lemma')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  function handleSort(key: 'lemma' | 'ipm') {
    if (key === sortKey) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortKey(key); setSortDir(key === 'ipm' ? 'desc' : 'asc') }
    setPage(0)
  }

  useEffect(() => {
    Promise.all([
      api.get<Entry[]>(`/${plural}`),
      api.get<LexemeTranslation[]>('/lexeme-translations'),
      api.get<LexemeFrequency[]>('/lexeme-frequencies'),
    ]).then(([items, trs, freqs]) => {
      setItems(items)
      setDeByLexeme(new Map(
        trs.filter(t => t.lang === 'de').map(t => [t.lexeme_id, t.text])
      ))
      setIpmByLexeme(new Map(
        freqs.filter(f => f.corpus === FREQ_CORPUS).map(f => [f.lexeme_id, f.ipm])
      ))
    })
  }, [plural])

  const q = stripAccent(filter.toLowerCase())
  const filtered = items
    .filter(n => !q || stripAccent(n.accented).toLowerCase().includes(q))
    .sort((a, b) => {
      let cmp: number
      if (sortKey === 'ipm') {
        const ai = ipmByLexeme.get(a.id) ?? -Infinity
        const bi = ipmByLexeme.get(b.id) ?? -Infinity
        cmp = ai - bi
      } else {
        cmp = stripAccent(a.accented).localeCompare(stripAccent(b.accented), 'uk')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const clampedPage = Math.min(page, Math.max(0, totalPages - 1))
  const paged = filtered.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)

  return (
    <div>
      <Nav />
      <DictionaryTabs />
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
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('lemma')}>
                {POS_TITLE[pos].slice(0, -1)} {sortKey === 'lemma' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              {pos === 'adjective' && <th>Gender</th>}
              <th>de</th>
              <th className="col-mobile-hide" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'normal', fontSize: '0.85em' }} onClick={() => handleSort('ipm')}>
                ipm ({FREQ_CORPUS}) {sortKey === 'ipm' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
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
                <td className="col-mobile-hide text-dim" style={{ fontSize: '0.8em' }}>
                  {ipmByLexeme.has(n.id) ? ipmByLexeme.get(n.id)!.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination
        currentPage={clampedPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}

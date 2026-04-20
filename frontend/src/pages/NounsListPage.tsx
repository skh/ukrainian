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
import { CEFR_LEVELS, CefrLevel, cefrColor, cefrTextColor, cefrOrder } from '../utils/cefr'

export default function NounsListPage() {
  const [nouns, setNouns] = useState<Entry[]>([])
  const [deByLexeme, setDeByLexeme] = useState<Map<number, string>>(new Map())
  const [ipmByLexeme, setIpmByLexeme] = useState<Map<number, number>>(new Map())
  const [cefrByLemma, setCefrByLemma] = useState<Map<string, string>>(new Map())
  const [selectedCefr, setSelectedCefr] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<'lemma' | 'ipm' | 'cefr'>('lemma')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  function handleSort(key: 'lemma' | 'ipm' | 'cefr') {
    if (key === sortKey) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortKey(key); setSortDir(key === 'ipm' ? 'desc' : 'asc') }
    setPage(0)
  }

  function toggleCefr(level: string) {
    setSelectedCefr(prev => { const n = new Set(prev); n.has(level) ? n.delete(level) : n.add(level); return n })
    setPage(0)
  }

  useEffect(() => {
    Promise.all([
      api.get<Entry[]>('/nouns'),
      api.get<LexemeTranslation[]>('/lexeme-translations'),
      api.get<LexemeFrequency[]>('/lexeme-frequencies'),
      api.get<Record<string, string>>('/cefr'),
    ]).then(([ns, trs, freqs, cefr]) => {
      setNouns(ns)
      setDeByLexeme(new Map(trs.filter(t => t.lang === 'de').map(t => [t.lexeme_id, t.text])))
      setIpmByLexeme(new Map(freqs.filter(f => f.corpus === FREQ_CORPUS).map(f => [f.lexeme_id, f.ipm])))
      setCefrByLemma(new Map(Object.entries(cefr)))
    })
  }, [])

  const q = stripAccent(filter.toLowerCase())
  const filtered = nouns
    .filter(n => {
      if (q && !stripAccent(n.accented).toLowerCase().includes(q)) return false
      if (selectedCefr.size > 0 && !selectedCefr.has(cefrByLemma.get(n.lemma) ?? '')) return false
      return true
    })
    .sort((a, b) => {
      if (sortKey === 'cefr') {
        const al = cefrByLemma.get(a.lemma), bl = cefrByLemma.get(b.lemma)
        if (!al && !bl) return 0
        if (!al) return sortDir === 'asc' ? 1 : -1
        if (!bl) return sortDir === 'asc' ? -1 : 1
        const cmp = cefrOrder[al as CefrLevel] - cefrOrder[bl as CefrLevel]
        return sortDir === 'asc' ? cmp : -cmp
      }
      let cmp: number
      if (sortKey === 'ipm') {
        cmp = (ipmByLexeme.get(a.id) ?? -Infinity) - (ipmByLexeme.get(b.id) ?? -Infinity)
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
      <h1>Nouns</h1>
      <Link to="/nouns/add">Add noun</Link>
      <br /><br />
      <input value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} placeholder="Filter..." />
      <br /><br />
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.75rem' }}>
        {CEFR_LEVELS.map(level => {
          const active = selectedCefr.has(level)
          return (
            <button key={level} onClick={() => toggleCefr(level)} style={{
              background: active ? cefrColor[level] : 'transparent',
              color: active ? cefrTextColor[level] : cefrColor[level],
              border: `2px solid ${cefrColor[level]}`,
              borderRadius: '4px', padding: '0.2em 0.6em',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85em',
            }}>{level}</button>
          )
        })}
      </div>
      {filtered.length === 0 ? (
        <p className="text-faint">No nouns yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="col-mobile-hide"></th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('lemma')}>
                Noun {sortKey === 'lemma' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th>Gender</th>
              <th>Number</th>
              <th>de</th>
              <th className="col-mobile-hide" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'normal', fontSize: '0.85em' }} onClick={() => handleSort('ipm')}>
                ipm {sortKey === 'ipm' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'normal', fontSize: '0.85em' }} onClick={() => handleSort('cefr')}>
                ПУЛЬС {sortKey === 'cefr' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((n, i) => {
              const level = cefrByLemma.get(n.lemma) as CefrLevel | undefined
              return (
                <tr key={n.id}>
                  <td className="col-mobile-hide" style={{ color: '#bbb', fontSize: '0.8em', textAlign: 'right', paddingRight: '0.5em' }}>{clampedPage * pageSize + i + 1}</td>
                  <td><Link to={`/nouns/${n.id}`}>{n.accented}</Link></td>
                  <td>
                    {n.gender ? (
                      <span className="badge" style={{ background: genderBg[n.gender] }}>{n.gender}</span>
                    ) : (
                      <span className="text-faint" style={{ fontSize: '0.85em' }}>—</span>
                    )}
                  </td>
                  <td className="text-secondary" style={{ fontSize: '0.85em' }}>{n.number_type ?? ''}</td>
                  <td className="text-dim" style={{ fontSize: '0.85em' }}>{deByLexeme.get(n.id) ?? ''}</td>
                  <td className="col-mobile-hide text-dim" style={{ fontSize: '0.8em' }}>
                    {ipmByLexeme.has(n.id) ? ipmByLexeme.get(n.id)!.toFixed(2) : '—'}
                  </td>
                  <td>
                    {level && (
                      <span style={{ background: cefrColor[level], color: cefrTextColor[level], padding: '0.1em 0.4em', borderRadius: '3px', fontSize: '0.8em', fontWeight: 600 }}>
                        {level}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <Pagination currentPage={clampedPage} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  )
}

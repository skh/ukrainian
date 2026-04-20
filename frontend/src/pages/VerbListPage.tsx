import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { stripAccent } from '../utils/forms'
import { Verb, Tag, AspectPair, PairTag, VerbFrequency, PairTranslation } from '../types'
import { aspectBg } from '../utils/theme'
import { TagChip } from '../widgets/TagChip'
import { TagPicker } from '../widgets/TagPicker'
import { tagColor } from '../widgets/tagColor'
import { Nav } from '../components/Nav'
import { Pagination } from '../components/Pagination'
import { DictionaryTabs } from '../components/DictionaryTabs'
import { FREQ_CORPUS } from '../config'
import { CEFR_LEVELS, CefrLevel, cefrColor, cefrTextColor, cefrOrder, lowerCefrLevel } from '../utils/cefr'

export default function VerbListPage() {
  const navigate = useNavigate()
  const [verbs, setVerbs] = useState<Verb[]>([])
  const [pairs, setPairs] = useState<AspectPair[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [pairTags, setPairTags] = useState<PairTag[]>([])
  const [filter, setFilter] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())
  const [allFrequencies, setAllFrequencies] = useState<VerbFrequency[]>([])
  const [allPairTranslations, setAllPairTranslations] = useState<PairTranslation[]>([])
  const [cefrByLemma, setCefrByLemma] = useState<Map<string, string>>(new Map())
  const [selectedCefr, setSelectedCefr] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<'lemma' | string>('lemma')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  async function load() {
    const [vs, ps, tags, pts, freqs, trs, cefr] = await Promise.all([
      api.get<Verb[]>('/verbs'),
      api.get<AspectPair[]>('/aspect-pairs'),
      api.get<Tag[]>('/tags'),
      api.get<PairTag[]>('/pair-tags'),
      api.get<VerbFrequency[]>('/frequencies'),
      api.get<PairTranslation[]>('/lexeme-translations'),
      api.get<Record<string, string>>('/cefr'),
    ])
    setVerbs(vs)
    setPairs(ps)
    setAllTags(tags)
    setPairTags(pts)
    setAllFrequencies(freqs)
    setAllPairTranslations(trs)
    setCefrByLemma(new Map(Object.entries(cefr)))
  }

  useEffect(() => { load() }, [])

  async function addTag(pairId: number, tagName: string) {
    const tag = await api.post<Tag>('/tags', { name: tagName })
    await api.post(`/pairs/${pairId}/tags/${tag.id}`, {})
    await load()
  }

  async function removeTag(pairId: number, tagId: number) {
    await api.delete(`/pairs/${pairId}/tags/${tagId}`)
    await load()
  }

  async function markAsSolo(verbId: number) {
    await api.post('/aspect-pairs/solo', { verb_id: verbId })
    await load()
  }

  const pairedIds = new Set(pairs.flatMap(p => [p.ipf_verb_id, p.pf_verb_id].filter((id): id is number => id !== null)))
  const unpairedVerbs = verbs.filter(v => !pairedIds.has(v.id))

  const q = stripAccent(filter.toLowerCase())

  const tagsForPair = (pairId: number): Tag[] =>
    pairTags
      .filter(pt => pt.pair_id === pairId)
      .map(pt => allTags.find(t => t.id === pt.tag_id))
      .filter((t): t is Tag => t !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name))

  function toggleCefr(level: string) {
    setSelectedCefr(prev => { const n = new Set(prev); n.has(level) ? n.delete(level) : n.add(level); return n })
    setPage(0)
  }

  function toggleTag(id: number) {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setPage(0)
  }

  const displayCorpora = [FREQ_CORPUS]

  // Sum canonical + variant ipm per canonical verb per corpus
  const summedIpm = new Map<string, number>()
  for (const f of allFrequencies) {
    const canonId = f.variant_of ?? f.verb_id
    const key = `${canonId}:${f.corpus}`
    summedIpm.set(key, (summedIpm.get(key) ?? 0) + f.ipm)
  }

  // Rank all fetched pairs per corpus (descending ipm). Unfetched pairs → no entry.
  const pairRanks = new Map<string, number>()
  for (const corpus of displayCorpora) {
    const fetched = pairs
      .map(p => {
        const ipfIpm = p.ipf_verb_id != null ? (summedIpm.get(`${p.ipf_verb_id}:${corpus}`) ?? 0) : 0
        const pfIpm = p.pf_verb_id != null ? (summedIpm.get(`${p.pf_verb_id}:${corpus}`) ?? 0) : 0
        const ipm = ipfIpm + pfIpm
        if (ipm === 0) return null
        return { pairId: p.id, ipm }
      })
      .filter((x): x is { pairId: number; ipm: number } => x !== null)
      .sort((a, b) => b.ipm - a.ipm)
    fetched.forEach((x, i) => pairRanks.set(`${x.pairId}:${corpus}`, i + 1))
  }

  function corpusSlot(p: AspectPair, corpus: string): { text: string; style: React.CSSProperties } {
    const ipfIpm = p.ipf_verb_id != null ? (summedIpm.get(`${p.ipf_verb_id}:${corpus}`) ?? 0) : 0
    const pfIpm = p.pf_verb_id != null ? (summedIpm.get(`${p.pf_verb_id}:${corpus}`) ?? 0) : 0
    const total = ipfIpm + pfIpm
    if (total === 0) return { text: '—', style: { color: '#ccc' } }

    const rank = pairRanks.get(`${p.id}:${corpus}`) ?? '?'
    let style: React.CSSProperties = { padding: '0 0.25em', borderRadius: '2px' }
    if (total > 0) {
      const r = ipfIpm / total
      if (r > 0.75)      style = { ...style, background: '#005BBB', color: 'white', fontWeight: 'bold' }
      else if (r > 0.55) style = { ...style, background: '#a8ccee', color: 'black' }
      else if (r < 0.25) style = { ...style, background: '#FFD700', color: 'black', fontWeight: 'bold' }
      else if (r < 0.45) style = { ...style, background: '#fff0a0', color: 'black' }
    }
    return { text: String(rank), style }
  }

  const usedTagIds = new Set(pairTags.map(pt => pt.tag_id))
  const filterTags = allTags.filter(t => usedTagIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name))

  const visiblePairs = pairs.filter(p => {
    if (q && !(
      (p.ipf_verb && stripAccent(p.ipf_verb.accented).toLowerCase().includes(q)) ||
      (p.pf_verb && stripAccent(p.pf_verb.accented).toLowerCase().includes(q))
    )) return false
    if (selectedTagIds.size > 0) {
      const pTags = tagsForPair(p.id)
      if (![...selectedTagIds].every(tid => pTags.some(t => t.id === tid))) return false
    }
    if (selectedCefr.size > 0) {
      const level = lowerCefrLevel(
        cefrByLemma.get(p.ipf_verb?.infinitive ?? '') as CefrLevel | undefined,
        cefrByLemma.get(p.pf_verb?.infinitive ?? '') as CefrLevel | undefined,
      )
      if (!selectedCefr.has(level ?? '')) return false
    }
    return true
  })

  function handleSort(key: string) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const sortedPairs = [...visiblePairs].sort((a, b) => {
    if (sortKey === 'cefr') {
      const al = lowerCefrLevel(
        cefrByLemma.get(a.ipf_verb?.infinitive ?? '') as CefrLevel | undefined,
        cefrByLemma.get(a.pf_verb?.infinitive ?? '') as CefrLevel | undefined,
      )
      const bl = lowerCefrLevel(
        cefrByLemma.get(b.ipf_verb?.infinitive ?? '') as CefrLevel | undefined,
        cefrByLemma.get(b.pf_verb?.infinitive ?? '') as CefrLevel | undefined,
      )
      if (!al && !bl) return 0
      if (!al) return sortDir === 'asc' ? 1 : -1
      if (!bl) return sortDir === 'asc' ? -1 : 1
      const cmp = cefrOrder[al] - cefrOrder[bl]
      return sortDir === 'asc' ? cmp : -cmp
    }
    let cmp: number
    if (sortKey === 'lemma') {
      const aLemma = a.ipf_verb?.accented ?? a.pf_verb?.accented ?? ''
      const bLemma = b.ipf_verb?.accented ?? b.pf_verb?.accented ?? ''
      cmp = stripAccent(aLemma).localeCompare(stripAccent(bLemma), 'uk')
    } else {
      const ra = pairRanks.get(`${a.id}:${sortKey}`) ?? Infinity
      const rb = pairRanks.get(`${b.id}:${sortKey}`) ?? Infinity
      cmp = ra - rb
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sortedPairs.length / pageSize)
  const clampedPage = Math.min(page, Math.max(0, totalPages - 1))
  const pagedPairs = sortedPairs.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)

  const visibleUnpaired = q
    ? unpairedVerbs.filter(v => stripAccent(v.accented).toLowerCase().includes(q))
    : unpairedVerbs

  const sortedUnpaired = [...visibleUnpaired].sort((a, b) =>
    stripAccent(a.accented).localeCompare(stripAccent(b.accented), 'uk')
  )

  return (
    <div>
      <Nav />
      <DictionaryTabs />
      <h1>Verbs</h1>
      <Link to="/verbs/add">Add verb</Link>
      <br /><br />
      <input
        value={filter}
        onChange={e => { setFilter(e.target.value); setPage(0) }}
        placeholder="Filter..."
      />
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
      {filterTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
          {filterTags.map(t => {
            const active = selectedTagIds.has(t.id)
            const colors = tagColor(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTag(t.id)}
                style={{
                  padding: '0.1em 0.55em',
                  borderRadius: '3px',
                  border: `1px solid ${colors.color}`,
                  background: active ? colors.background : 'transparent',
                  color: active ? colors.color : colors.color,
                  cursor: 'pointer',
                  fontSize: '0.78em',
                  opacity: active ? 1 : 0.55,
                }}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th className="col-mobile-hide"></th>
            <th
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => handleSort('lemma')}
            >
              Verb {sortKey === 'lemma' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.85em' }}>DE</th>
            <th className="col-mobile-hide">Tags</th>
            {displayCorpora.length > 0 && (
              <th className="col-mobile-hide">
                {displayCorpora.map(corpus => (
                  <span
                    key={corpus}
                    onClick={() => handleSort(corpus)}
                    style={{ cursor: 'pointer', userSelect: 'none', marginRight: '0.5em', whiteSpace: 'nowrap' }}
                  >
                    ipm{sortKey === corpus ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </span>
                ))}
              </th>
            )}
            <th style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'normal', fontSize: '0.85em' }} onClick={() => handleSort('cefr')}>
              ПУЛЬС {sortKey === 'cefr' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {pagedPairs.map((p, i) => (
            <tr key={p.id}>
              <td className="col-mobile-hide" style={{ color: '#bbb', fontSize: '0.8em', textAlign: 'right', paddingRight: '0.5em' }}>{clampedPage * pageSize + i + 1}</td>
              <td
                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => navigate(`/pairs/${p.id}`)}
                title={(() => {
                  const ts = allPairTranslations.filter(t => t.lexeme_id === p.lexeme_id)
                  if (ts.length === 0) return undefined
                  const byLang: Record<string, string[]> = {}
                  for (const t of ts) (byLang[t.lang] ??= []).push(t.text)
                  return Object.entries(byLang).map(([lang, texts]) => `${lang}: ${texts.join(', ')}`).join('\n')
                })()}
              >
                {p.ipf_verb && (
                  <span className="badge" style={{ background: aspectBg.ipf }}>
                    {p.ipf_verb.accented}
                  </span>
                )}
                {p.ipf_verb && p.pf_verb && (
                  <span style={{ color: '#bbb', margin: '0 0.15em' }}>(</span>
                )}
                {p.pf_verb && (
                  <span className="badge" style={{ background: aspectBg.pf }}>
                    {p.pf_verb.accented}
                  </span>
                )}
                {p.ipf_verb && p.pf_verb && (
                  <span style={{ color: '#bbb' }}>)</span>
                )}
              </td>
              <td className="text-dim" style={{ fontSize: '0.85em' }}>
                {allPairTranslations.filter(t => t.lexeme_id === p.lexeme_id && t.lang === 'de').map(t => t.text).join(', ')}
              </td>
              <td className="col-mobile-hide">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.3rem' }}>
                  {tagsForPair(p.id).map(t => (
                    <TagChip key={t.id} tag={t} onRemove={() => removeTag(p.id, t.id)} />
                  ))}
                  <TagPicker
                    allTags={allTags}
                    assignedTagIds={new Set(tagsForPair(p.id).map(t => t.id))}
                    onAdd={name => addTag(p.id, name)}
                  />
                </div>
              </td>
              {displayCorpora.length > 0 && (() => {
                const slots = displayCorpora.map(corpus => corpusSlot(p, corpus))
                const hasAny = slots.some(s => s.text !== '—')
                return (
                  <td className="col-mobile-hide" style={{ fontSize: '0.8em', whiteSpace: 'nowrap' }}
                      title={displayCorpora.map((c, i) => `${c}: ${slots[i].text}`).join('\n')}>
                    {hasAny && (
                      <>
                        {'('}
                        {slots.map((s, i) => (
                          <span key={i}>
                            {i > 0 && <span style={{ color: '#bbb' }}> / </span>}
                            <span style={s.style}>{s.text}</span>
                          </span>
                        ))}
                        {')'}
                      </>
                    )}
                  </td>
                )
              })()}
              {(() => {
                const level = lowerCefrLevel(
                  cefrByLemma.get(p.ipf_verb?.infinitive ?? '') as CefrLevel | undefined,
                  cefrByLemma.get(p.pf_verb?.infinitive ?? '') as CefrLevel | undefined,
                )
                return (
                  <td>
                    {level && (
                      <span style={{ background: cefrColor[level], color: cefrTextColor[level], padding: '0.1em 0.4em', borderRadius: '3px', fontSize: '0.8em', fontWeight: 600 }}>
                        {level}
                      </span>
                    )}
                  </td>
                )
              })()}
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        currentPage={clampedPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {displayCorpora.length > 0 && (() => {
        const verbIdsWithFreq = new Set(allFrequencies.map(f => f.verb_id))
        const noFreqPairs = pairs.filter(p =>
          (p.ipf_verb_id == null || !verbIdsWithFreq.has(p.ipf_verb_id)) &&
          (p.pf_verb_id == null || !verbIdsWithFreq.has(p.pf_verb_id))
        )
        if (noFreqPairs.length === 0) return null
        const sorted = [...noFreqPairs].sort((a, b) => {
          const aLemma = a.ipf_verb?.accented ?? a.pf_verb?.accented ?? ''
          const bLemma = b.ipf_verb?.accented ?? b.pf_verb?.accented ?? ''
          return stripAccent(aLemma).localeCompare(stripAccent(bLemma), 'uk')
        })
        return (
          <>
            <h2 style={{ marginTop: '2rem' }}>No frequency data</h2>
            <div style={{ overflowX: 'auto' }}><table>
              <tbody>
                {sorted.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/pairs/${p.id}`)}>
                    <td>
                      {p.ipf_verb && (
                        <span className="badge" style={{ background: aspectBg.ipf, marginRight: '0.3em' }}>
                          {p.ipf_verb.accented}
                        </span>
                      )}
                      {p.pf_verb && (
                        <span className="badge" style={{ background: aspectBg.pf }}>
                          {p.pf_verb.accented}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </>
        )
      })()}

      {sortedUnpaired.length > 0 && (
        <>
          <h2 style={{ marginTop: '2rem' }}>Unpaired verbs</h2>
          <div style={{ overflowX: 'auto' }}><table>
            <thead>
              <tr>
                <th>Imperfective</th>
                <th>Perfective</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedUnpaired.map(v => (
                <tr key={v.id}>
                  <td style={v.aspect === 'ipf' ? { background: aspectBg.ipf } : undefined}>
                    {v.aspect === 'ipf' ? <Link to={`/verbs/${v.id}/edit`}>{v.accented}</Link> : ''}
                  </td>
                  <td style={v.aspect === 'pf' ? { background: aspectBg.pf } : undefined}>
                    {v.aspect === 'pf' ? <Link to={`/verbs/${v.id}/edit`}>{v.accented}</Link> : ''}
                  </td>
                  <td>
                    <button onClick={() => markAsSolo(v.id)}>Mark as solo</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </div>
  )
}

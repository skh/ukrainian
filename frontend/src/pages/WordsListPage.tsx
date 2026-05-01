import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Lexeme, LexemeTranslation, LexemeFrequency, LexemeTag, Tag, VerbFrequency } from '../types'
import { Nav } from '../components/Nav'
import { DictionaryTabs } from '../components/DictionaryTabs'
import { Pagination } from '../components/Pagination'
import { genderBg } from '../utils/nouns'
import { aspectBg } from '../utils/theme'
import { stripAccent } from '../utils/forms'
import { FREQ_CORPUS } from '../config'
import { CEFR_LEVELS, CefrLevel, cefrColor, cefrTextColor, cefrOrder, lowerCefrLevel } from '../utils/cefr'
import { TagChip } from '../widgets/TagChip'
import { TagPicker } from '../widgets/TagPicker'
import { tagColor } from '../widgets/tagColor'
import { FilterPill } from '../widgets/FilterPill'

const posBg: Record<string, string> = {
  noun:        '#d1fae5',
  adjective:   '#e9d5ff',
  adverb:      '#fce7f3',
  conjunction: '#fef9c3',
  numeral:     '#ffedd5',
  preposition: '#e0f2fe',
  pronoun:     '#fae8ff',
  particle:    '#fef3c7',
  predicative: '#ecfdf5',
  pair:        '#ffffff',
}

function entryPath(e: Lexeme) {
  if (e.pos === 'pair') return e.pair_id ? `/pairs/${e.pair_id}` : '#'
  if (e.pos === 'noun') return `/nouns/${e.id}`
  if (e.pos === 'adjective') return `/adjectives/${e.id}`
  if (e.pos === 'pronoun') return `/pronouns/${e.id}`
  if (e.pos === 'numeral') return `/numerals/${e.id}`
  return `/words/${e.id}`
}

function entryLabel(e: Lexeme) {
  if (e.pos === 'pair' && e.pair) {
    const { ipf_verb, pf_verb } = e.pair
    return (
      <>
        {ipf_verb && (
          <>
            <span style={{ background: aspectBg.ipf, padding: '0.1em 0.35em', borderRadius: '3px', marginRight: '0.15em' }}>{ipf_verb.accented}</span>
            {ipf_verb.variants.length > 0 && (
              <span style={{ color: '#888', fontSize: '0.85em', marginRight: '0.2em' }}>({ipf_verb.variants.map(v => v.accented).join(', ')})</span>
            )}
          </>
        )}
        {pf_verb && (
          <>
            <span style={{ background: aspectBg.pf, padding: '0.1em 0.35em', borderRadius: '3px' }}>{pf_verb.accented}</span>
            {pf_verb.variants.length > 0 && (
              <span style={{ color: '#888', fontSize: '0.85em', marginLeft: '0.2em' }}>({pf_verb.variants.map(v => v.accented).join(', ')})</span>
            )}
          </>
        )}
      </>
    )
  }
  return e.accented
}

function entryText(e: Lexeme): string {
  if (e.pos === 'pair' && e.pair) {
    const ipfForms = [e.pair.ipf_verb?.accented, ...(e.pair.ipf_verb?.variants.map(v => v.accented) ?? [])].filter(Boolean)
    const pfForms = [e.pair.pf_verb?.accented, ...(e.pair.pf_verb?.variants.map(v => v.accented) ?? [])].filter(Boolean)
    return [...ipfForms, ...pfForms].join(' ')
  }
  return e.accented
}

function entryCefr(e: Lexeme, cefrByLemma: Map<string, string>): CefrLevel | undefined {
  if (e.pos === 'pair' && e.pair) {
    return lowerCefrLevel(
      cefrByLemma.get(e.pair.ipf_verb?.infinitive ?? '') as CefrLevel | undefined,
      cefrByLemma.get(e.pair.pf_verb?.infinitive ?? '') as CefrLevel | undefined,
    )
  }
  return cefrByLemma.get(e.lemma) as CefrLevel | undefined
}

export default function WordsListPage() {
  const [entries, setEntries] = useState<Lexeme[]>([])
  const [deByLexeme, setDeByLexeme] = useState<Map<number, string>>(new Map())
  const [ipmByLexeme, setIpmByLexeme] = useState<Map<number, number>>(new Map())
  const [verbIpmByVerbId, setVerbIpmByVerbId] = useState<Map<number, number>>(new Map())
  const [cefrByLemma, setCefrByLemma] = useState<Map<string, string>>(new Map())
  const [selectedCefr, setSelectedCefr] = useState<Set<string>>(new Set())
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [lexemeTags, setLexemeTags] = useState<LexemeTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())
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

  function toggleTag(id: number) {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setPage(0)
  }

  const tagsForLexeme = (lexemeId: number): Tag[] =>
    lexemeTags
      .filter(lt => lt.lexeme_id === lexemeId)
      .map(lt => allTags.find(t => t.id === lt.tag_id))
      .filter((t): t is Tag => t !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name))

  async function addTag(lexemeId: number, tagName: string) {
    const tag = await api.post<Tag>('/tags', { name: tagName })
    await api.post(`/lexemes/${lexemeId}/tags/${tag.id}`, {})
    await load()
  }

  async function removeTag(lexemeId: number, tagId: number) {
    await api.delete(`/lexemes/${lexemeId}/tags/${tagId}`)
    await load()
  }

  async function load() {
    const [es, trs, freqs, verbFreqs, cefr, tags, lts] = await Promise.all([
      api.get<Lexeme[]>('/words'),
      api.get<LexemeTranslation[]>('/lexeme-translations'),
      api.get<LexemeFrequency[]>('/lexeme-frequencies'),
      api.get<VerbFrequency[]>('/frequencies'),
      api.get<Record<string, string>>('/cefr'),
      api.get<Tag[]>('/tags'),
      api.get<LexemeTag[]>('/lexeme-tags'),
    ])
    setEntries(es)
    setDeByLexeme(new Map(trs.filter(t => t.lang === 'de').map(t => [t.lexeme_id, t.text])))
    setIpmByLexeme(new Map(freqs.filter(f => f.corpus === FREQ_CORPUS).map(f => [f.lexeme_id, f.ipm])))
    const summedVerbIpm = new Map<number, number>()
    for (const f of verbFreqs.filter(f => f.corpus === FREQ_CORPUS)) {
      const canonId = f.variant_of ?? f.verb_id
      summedVerbIpm.set(canonId, (summedVerbIpm.get(canonId) ?? 0) + f.ipm)
    }
    setVerbIpmByVerbId(summedVerbIpm)
    setCefrByLemma(new Map(Object.entries(cefr)))
    setAllTags(tags)
    setLexemeTags(lts)
  }

  useEffect(() => { load() }, [])

  function entryIpm(e: Lexeme): number | undefined {
    if (e.pos === 'pair' && e.pair) {
      const total = (verbIpmByVerbId.get(e.pair.ipf_verb_id ?? -1) ?? 0)
                  + (verbIpmByVerbId.get(e.pair.pf_verb_id ?? -1) ?? 0)
      return total > 0 ? total : undefined
    }
    return ipmByLexeme.get(e.id)
  }

  const q = stripAccent(filter.toLowerCase())
  const filtered = entries
    .filter(e => {
      if (q && !stripAccent(entryText(e)).toLowerCase().includes(q)) return false
      if (selectedCefr.size > 0 && !selectedCefr.has(entryCefr(e, cefrByLemma) ?? '')) return false
      if (selectedTagIds.size > 0) {
        const eTags = tagsForLexeme(e.id)
        if (![...selectedTagIds].every(tid => eTags.some(t => t.id === tid))) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortKey === 'cefr') {
        const al = entryCefr(a, cefrByLemma), bl = entryCefr(b, cefrByLemma)
        if (!al && !bl) return 0
        if (!al) return sortDir === 'asc' ? 1 : -1
        if (!bl) return sortDir === 'asc' ? -1 : 1
        const cmp = cefrOrder[al as CefrLevel] - cefrOrder[bl as CefrLevel]
        return sortDir === 'asc' ? cmp : -cmp
      }
      let cmp: number
      if (sortKey === 'ipm') {
        cmp = (entryIpm(a) ?? -Infinity) - (entryIpm(b) ?? -Infinity)
      } else {
        cmp = stripAccent(entryText(a)).localeCompare(stripAccent(entryText(b)), 'uk')
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
      <h1>Words</h1>
      <Link to="/nouns/add">Add noun</Link>
      {' | '}
      <Link to="/adjectives/add">Add adjective</Link>
      {' | '}
      <Link to="/pronouns/add">Add pronoun</Link>
      {' | '}
      <Link to="/numerals/add">Add numeral</Link>
      {' | '}
      <Link to="/words/add">Add word</Link>
      <br /><br />
      <input value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} placeholder="Filter..." />
      <br /><br />
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
        {CEFR_LEVELS.map(level => (
          <FilterPill key={level} label={level} active={selectedCefr.has(level)}
            background={cefrColor[level]} color={cefrTextColor[level]}
            onToggle={() => toggleCefr(level)} />
        ))}
      </div>
      {allTags.filter(t => lexemeTags.some(lt => lt.tag_id === t.id)).length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {allTags.filter(t => lexemeTags.some(lt => lt.tag_id === t.id)).sort((a, b) => a.name.localeCompare(b.name)).map(t => {
            const { background, color } = tagColor(t.id)
            return <FilterPill key={t.id} label={t.name} active={selectedTagIds.has(t.id)}
              background={background} color={color} onToggle={() => toggleTag(t.id)} />
          })}
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-faint">No entries yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="col-mobile-hide"></th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('lemma')}>
                Word {sortKey === 'lemma' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th>POS</th>
              <th>Info</th>
              <th>de</th>
              <th className="col-mobile-hide" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'normal', fontSize: '0.85em' }} onClick={() => handleSort('ipm')}>
                ipm {sortKey === 'ipm' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'normal', fontSize: '0.85em' }} onClick={() => handleSort('cefr')}>
                ПУЛЬС {sortKey === 'cefr' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="col-mobile-hide">Tags</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((e, i) => {
              const level = entryCefr(e, cefrByLemma) as CefrLevel | undefined
              return (
                <tr key={e.id}>
                  <td className="col-mobile-hide" style={{ color: '#bbb', fontSize: '0.8em', textAlign: 'right', paddingRight: '0.5em' }}>{clampedPage * pageSize + i + 1}</td>
                  <td><Link to={entryPath(e)}>{entryLabel(e)}</Link></td>
                  <td>
                    <span className="badge" style={{ background: e.pos === 'pair' ? '#dbeafe' : (posBg[e.pos] ?? '#eee') }}>
                      {e.pos === 'pair' ? 'verb' : e.pos}
                    </span>
                  </td>
                  <td className="text-dim">
                    {e.pos === 'noun' && (
                      <>
                        {e.gender && <span className="badge" style={{ background: genderBg[e.gender], marginRight: '0.4em' }}>{e.gender}</span>}
                        {e.number_type && e.number_type !== 'both' && <span className="text-muted">{e.number_type}</span>}
                      </>
                    )}
                  </td>
                  <td className="text-dim" style={{ fontSize: '0.85em' }}>{deByLexeme.get(e.id) ?? ''}</td>
                  <td className="col-mobile-hide text-dim" style={{ fontSize: '0.8em' }}>
                    {entryIpm(e) != null ? entryIpm(e)!.toFixed(2) : '—'}
                  </td>
                  <td>
                    {level && (
                      <span style={{ background: cefrColor[level], color: cefrTextColor[level], padding: '0.1em 0.4em', borderRadius: '3px', fontSize: '0.8em', fontWeight: 600 }}>
                        {level}
                      </span>
                    )}
                  </td>
                  <td className="col-mobile-hide">
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.3rem' }}>
                      {tagsForLexeme(e.id).map(t => (
                        <TagChip key={t.id} tag={t} onRemove={() => removeTag(e.id, t.id)} />
                      ))}
                      <TagPicker
                        allTags={allTags}
                        assignedTagIds={new Set(tagsForLexeme(e.id).map(t => t.id))}
                        onAdd={name => addTag(e.id, name)}
                      />
                    </div>
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

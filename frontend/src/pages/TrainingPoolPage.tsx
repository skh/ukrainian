import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { AspectPair, Chunk, Tag, PairTranslation } from '../types'
import { Nav } from '../components/Nav'
import { aspectBg } from '../utils/theme'
import { stripAccent } from '../utils/forms'
import { SLOTS_ALL, SLOTS_NUMBER } from '../utils/drillSlots'
import { FormSlotPicker } from '../widgets/FormSlotPicker'
import {
  Pool, PoolItem, ItemParams, getPools, getPoolItems, removePoolItem, addPoolItems,
} from '../training/db'

type DrillType = 'aspect' | 'infinitive' | 'number' | 'translation'
type AddTab = 'verbs' | 'chunks'

function pairLabel(p: AspectPair): string {
  return [p.ipf_verb?.accented, p.pf_verb?.accented].filter(Boolean).join(' / ')
}

export default function TrainingPoolPage() {
  const { poolId } = useParams<{ poolId: string }>()

  const [pool, setPool] = useState<Pool | null>(null)
  const [items, setItems] = useState<PoolItem[]>([])

  // Backend data
  const [pairs, setPairs] = useState<AspectPair[]>([])
  const [lexemeTags, setLexemeTags] = useState<{ lexeme_id: number; tag_id: number }[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [pairTranslations, setPairTranslations] = useState<PairTranslation[]>([])
  const [chunks, setChunks] = useState<Chunk[]>([])

  // Add-verbs UI state
  const [addTab, setAddTab] = useState<AddTab>('verbs')
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)
  const [selectedPairIds, setSelectedPairIds] = useState<Set<number>>(new Set())
  const [drillType, setDrillType] = useState<DrillType>('aspect')
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set(SLOTS_ALL.map(s => s.key)))
  // Add-chunks UI state
  const [chunkFilter, setChunkFilter] = useState('')
  const [selectedChunkIds, setSelectedChunkIds] = useState<Set<number>>(new Set())

  const [addStatus, setAddStatus] = useState<string | null>(null)

  async function loadFromDB() {
    if (!poolId) return
    const allPools = await getPools()
    setPool(allPools.find(p => p.id === poolId) ?? null)
    const its = await getPoolItems(poolId)
    setItems(its.sort((a, b) => b.weight - a.weight))
  }

  useEffect(() => {
    loadFromDB()
    Promise.all([
      api.get<AspectPair[]>('/aspect-pairs'),
      api.get<{ lexeme_id: number; tag_id: number }[]>('/lexeme-tags'),
      api.get<Tag[]>('/tags'),
      api.get<PairTranslation[]>('/lexeme-translations'),
      api.get<Chunk[]>('/chunks'),
    ]).then(([ps, lts, tags, trs, chs]) => {
      setPairs(ps)
      setLexemeTags(lts)
      setAllTags(tags)
      setPairTranslations(trs)
      setChunks(chs)
    })
  }, [poolId])

  async function handleRemoveItem(itemKey: string) {
    if (!poolId) return
    await removePoolItem(poolId, itemKey)
    loadFromDB()
  }

  async function handleAddVerbs() {
    if (!poolId || selectedPairIds.size === 0) return
    const newItems: Omit<PoolItem, 'weight'>[] = []
    for (const pairId of selectedPairIds) {
      const pair = pairs.find(p => p.id === pairId)!
      const label = pairLabel(pair)
      const deText = pair.lexeme_id !== null
        ? (pairTranslations.find(t => t.lexeme_id === pair.lexeme_id && t.lang === 'de')?.text ?? null)
        : null

      if (drillType === 'translation') {
        for (const dir of ['uk→de', 'de→uk'] as const) {
          newItems.push({
            poolId,
            itemKey: `verb_translation:${pairId}:${dir}`,
            displayLabel: `${label} — translation ${dir}`,
            ukText: label,
            deText,
            params: { kind: 'verb_translation', pairId, direction: dir } satisfies ItemParams,
          })
        }
      } else {
        const availSlots = drillType === 'number' ? SLOTS_NUMBER : SLOTS_ALL
        const slotsToAdd = availSlots.filter(s => selectedSlots.has(s.key))
        for (const slot of slotsToAdd) {
          newItems.push({
            poolId,
            itemKey: `verb_${drillType}:${pairId}:${slot.key}`,
            displayLabel: `${label} — ${slot.label} [${drillType}]`,
            ukText: label,
            deText,
            params: { kind: `verb_${drillType}` as 'verb_aspect' | 'verb_infinitive' | 'verb_number', pairId, slot: slot.key } satisfies ItemParams,
          })
        }
      }
    }
    const { added, skipped } = await addPoolItems(newItems)
    setAddStatus(`Added ${added}${skipped > 0 ? `, ${skipped} already present` : ''}`)
    setSelectedPairIds(new Set())
    loadFromDB()
  }

  async function handleAddChunks() {
    if (!poolId || selectedChunkIds.size === 0) return
    const newItems: Omit<PoolItem, 'weight'>[] = []
    for (const chunkId of selectedChunkIds) {
      const chunk = chunks.find(c => c.id === chunkId)!
      const deText = chunk.translations.find(t => t.lang === 'de')?.text ?? null
      for (const dir of ['uk→de', 'de→uk'] as const) {
        newItems.push({
          poolId,
          itemKey: `chunk:${chunkId}:${dir}`,
          displayLabel: `${chunk.text.slice(0, 40)} [chunk ${dir}]`,
          ukText: chunk.text,
          deText,
          params: { kind: 'chunk', chunkId, direction: dir } satisfies ItemParams,
        })
      }
    }
    const { added, skipped } = await addPoolItems(newItems)
    setAddStatus(`Added ${added}${skipped > 0 ? `, ${skipped} already present` : ''}`)
    setSelectedChunkIds(new Set())
    loadFromDB()
  }

  // Pairs filtered by selected tag
  const filteredPairs = selectedTagId === null
    ? pairs
    : pairs.filter(p => p.lexeme_id !== null && lexemeTags.some(lt => lt.lexeme_id === p.lexeme_id && lt.tag_id === selectedTagId))

  const sortedPairs = [...filteredPairs].sort((a, b) =>
    stripAccent(pairLabel(a)).localeCompare(stripAccent(pairLabel(b)), 'uk')
  )

  const filteredChunks = chunkFilter
    ? chunks.filter(c => {
        const q = stripAccent(chunkFilter.toLowerCase())
        return (
          stripAccent(c.text.toLowerCase()).includes(q) ||
          c.translations.some(t => stripAccent(t.text.toLowerCase()).includes(q))
        )
      })
    : chunks

  const slotAvailable = drillType === 'number' ? SLOTS_NUMBER : SLOTS_ALL

  const weightColor = (w: number) => {
    if (w >= 2.5) return '#c00'
    if (w >= 1.5) return '#c70'
    if (w <= 0.4) return '#080'
    return '#555'
  }

  if (!pool && poolId) return <div><Nav /><p style={{ color: '#aaa' }}>Pool not found.</p></div>

  return (
    <div>
      <Nav />
      <div style={{ marginBottom: '0.5rem' }}>
        <Link to="/training" style={{ color: '#888', fontSize: '0.9em' }}>← Pools</Link>
      </div>
      <h1 style={{ marginBottom: '0.25rem' }}>{pool?.name}</h1>
      <p style={{ color: '#888', fontSize: '0.85em', marginTop: 0 }}>{items.length} items</p>

      {/* ── Current items ───────────────────────────────────────── */}
      {items.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: '0.8em', color: '#aaa' }}>
                <th style={{ textAlign: 'left', paddingBottom: '0.3rem', width: '55%' }}>Item</th>
                <th style={{ textAlign: 'right', paddingBottom: '0.3rem', paddingRight: '1rem' }}>Weight</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.itemKey} style={{ borderTop: '1px solid #f3f3f3' }}>
                  <td style={{ padding: '0.25rem 0', fontSize: '0.9em' }}>
                    {item.displayLabel}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '1rem', fontFamily: 'monospace', fontSize: '0.85em', color: weightColor(item.weight) }}>
                    {item.weight.toFixed(2)}
                  </td>
                  <td>
                    <button
                      onClick={() => handleRemoveItem(item.itemKey)}
                      style={{ fontSize: '0.75em', color: '#c00' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add items ────────────────────────────────────────────── */}
      <h2 style={{ fontSize: '1em', marginBottom: '0.75rem' }}>Add items</h2>

      <div style={{ display: 'flex', gap: 0, marginBottom: '1rem', borderBottom: '2px solid #e5e7eb' }}>
        {(['verbs', 'chunks'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setAddTab(t); setAddStatus(null) }}
            style={{
              padding: '0.3em 0.8em', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: addTab === t ? 600 : 'normal',
              color: addTab === t ? '#111' : '#888',
              borderBottom: addTab === t ? '2px solid #111' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t === 'verbs' ? 'Verb drills' : 'Chunks'}
          </button>
        ))}
      </div>

      {addStatus && (
        <div style={{ color: '#080', fontSize: '0.85em', marginBottom: '0.75rem' }}>{addStatus}</div>
      )}

      {addTab === 'verbs' && (
        <div>
          {/* Tag filter */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.85em', color: '#666', marginRight: '0.5rem' }}>Filter by tag:</label>
            <select value={selectedTagId ?? ''} onChange={e => { setSelectedTagId(e.target.value ? Number(e.target.value) : null); setSelectedPairIds(new Set()) }}>
              <option value="">All pairs</option>
              {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Pair list */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px', padding: '0.4rem', marginBottom: '0.75rem' }}>
            {sortedPairs.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: '0.85em' }}>No pairs.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {sortedPairs.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.9em' }}>
                    <input
                      type="checkbox"
                      checked={selectedPairIds.has(p.id)}
                      onChange={() => {
                        setSelectedPairIds(prev => {
                          const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n
                        })
                      }}
                    />
                    {p.ipf_verb && <span style={{ background: aspectBg.ipf, padding: '0.05em 0.3em', borderRadius: '3px', fontSize: '0.85em' }}>{p.ipf_verb.accented}</span>}
                    {p.pf_verb && <span style={{ background: aspectBg.pf, padding: '0.05em 0.3em', borderRadius: '3px', fontSize: '0.85em' }}>{p.pf_verb.accented}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.8em', color: '#888' }}>
            {selectedPairIds.size} pair{selectedPairIds.size !== 1 ? 's' : ''} selected
            {sortedPairs.length > 0 && (
              <>
                {' · '}
                <span style={{ cursor: 'pointer', color: '#555' }} onClick={() => setSelectedPairIds(new Set(sortedPairs.map(p => p.id)))}>all</span>
                {' · '}
                <span style={{ cursor: 'pointer', color: '#555' }} onClick={() => setSelectedPairIds(new Set())}>none</span>
              </>
            )}
          </div>

          {/* Drill type */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.85em', color: '#666', marginRight: '0.5rem' }}>Drill type:</label>
            {(['aspect', 'infinitive', 'number', 'translation'] as const).map(dt => (
              <label key={dt} style={{ marginRight: '0.8rem', fontSize: '0.9em' }}>
                <input type="radio" name="drillType" checked={drillType === dt} onChange={() => setDrillType(dt)} />{' '}
                {dt === 'aspect' ? 'Aspect form' : dt === 'infinitive' ? 'Infinitive→form' : dt === 'number' ? 'Singular/plural' : 'Translation'}
              </label>
            ))}
          </div>

          {/* Slot picker */}
          {drillType !== 'translation' && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '0.2rem' }}>Form slots:</div>
              <FormSlotPicker slots={selectedSlots} available={slotAvailable} onChange={setSelectedSlots} />
            </div>
          )}

          <button
            onClick={handleAddVerbs}
            disabled={selectedPairIds.size === 0 || (drillType !== 'translation' && selectedSlots.size === 0)}
          >
            Add to pool
          </button>
        </div>
      )}

      {addTab === 'chunks' && (
        <div>
          <input
            value={chunkFilter}
            onChange={e => setChunkFilter(e.target.value)}
            placeholder="Filter chunks..."
            style={{ marginBottom: '0.75rem', padding: '0.3em 0.5em' }}
          />
          <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px', padding: '0.4rem', marginBottom: '0.75rem' }}>
            {filteredChunks.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: '0.85em' }}>No chunks.</div>
            ) : (
              filteredChunks.map(c => {
                const de = c.translations.find(t => t.lang === 'de')
                return (
                  <label key={c.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', padding: '0.2rem 0', cursor: 'pointer', fontSize: '0.9em', borderBottom: '1px solid #f5f5f5' }}>
                    <input
                      type="checkbox"
                      checked={selectedChunkIds.has(c.id)}
                      onChange={() => {
                        setSelectedChunkIds(prev => {
                          const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n
                        })
                      }}
                    />
                    <span>{c.text}</span>
                    {de && <span style={{ color: '#888', fontSize: '0.85em' }}>— {de.text}</span>}
                  </label>
                )
              })
            )}
          </div>
          <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '0.5rem' }}>
            {selectedChunkIds.size} selected · adds 2 items per chunk (both directions)
          </div>
          <button onClick={handleAddChunks} disabled={selectedChunkIds.size === 0}>
            Add to pool
          </button>
        </div>
      )}
    </div>
  )
}

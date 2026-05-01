import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { Verb, AspectPair, PairTranslation, Chunk } from '../types'
import { aspectBg } from '../utils/theme'
import { selectForm, stripAccent } from '../utils/forms'
import { formSlotKey, generateAspectQuestion, generateInfinitiveQuestion, generateNumberQuestion, PromptLine } from '../utils/drillGenerators'
import {
  PoolItem, getPoolItems, updateWeight, setAccentFlag, touchLastSeen,
} from '../training/db'

// VerbFormRead is the shape returned by /verb-forms
interface VerbFormRead {
  id: number
  verb_id: number
  tense: 'present' | 'future' | 'past' | 'imperative'
  person: '1' | '2' | '3' | null
  number: 'singular' | 'plural' | null
  gender: 'masculine' | 'feminine' | 'neuter' | null
  form: string
}

interface DrawEntry {
  itemKey: string
  totalWeight: number
  sources: Array<{ poolId: string; itemKey: string }>
  item: PoolItem
}

interface TrainingQuestion {
  itemKey: string
  sources: DrawEntry['sources']
  promptText: string
  promptDisplay?: PromptLine[]
  answerText: string
  contextLabel?: string
}

function weightedDraw(entries: DrawEntry[]): DrawEntry | null {
  if (entries.length === 0) return null
  const total = entries.reduce((s, e) => s + e.totalWeight, 0)
  let r = Math.random() * total
  for (const e of entries) {
    r -= e.totalWeight
    if (r <= 0) return e
  }
  return entries[entries.length - 1]
}

function buildFormsMap(rawForms: VerbFormRead[]): Map<number, VerbFormRead[]> {
  // Merge multiple rows for the same (verb_id, slot) — same logic as DrillPage
  const slotMap = new Map<string, { verbId: number; base: VerbFormRead; forms: string[] }>()
  for (const f of rawForms) {
    const slot = `${f.verb_id}:${f.tense},${f.person ?? ''},${f.number ?? ''},${f.gender ?? ''}`
    const entry = slotMap.get(slot)
    if (!entry) slotMap.set(slot, { verbId: f.verb_id, base: f, forms: [f.form] })
    else entry.forms.push(f.form)
  }
  const map = new Map<number, VerbFormRead[]>()
  for (const { verbId, base, forms } of slotMap.values()) {
    const arr = map.get(verbId) ?? []
    arr.push({ ...base, form: forms.join(', ') })
    map.set(verbId, arr)
  }
  return map
}

export default function TrainingSessionPage() {
  const [searchParams] = useSearchParams()
  const poolIds = (searchParams.get('pools') ?? '').split(',').filter(Boolean)

  // Backend data
  const [verbsMap, setVerbsMap] = useState<Map<number, Verb>>(new Map())
  const [pairsMap, setPairsMap] = useState<Map<number, AspectPair>>(new Map())
  const [formsByVerbId, setFormsByVerbId] = useState<Map<number, VerbFormRead[]>>(new Map())
  const [verbToLexemeId, setVerbToLexemeId] = useState<Map<number, number>>(new Map())
  const [pairTranslations, setPairTranslations] = useState<PairTranslation[]>([])
  const [chunksMap, setChunksMap] = useState<Map<number, Chunk>>(new Map())

  // IndexedDB draw pool
  const [drawPool, setDrawPool] = useState<DrawEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Session state
  const [question, setQuestion] = useState<TrainingQuestion | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function init() {
      const [pairs, rawForms, trs, chunks, rawVerbs] = await Promise.all([
        api.get<AspectPair[]>('/aspect-pairs'),
        api.get<VerbFormRead[]>('/verb-forms'),
        api.get<PairTranslation[]>('/lexeme-translations'),
        api.get<Chunk[]>('/chunks'),
        api.get<Verb[]>('/verbs'),
      ])

      const vm = new Map(rawVerbs.map(v => [v.id, v]))
      const pm = new Map(pairs.map(p => [p.id, p]))
      const fm = buildFormsMap(rawForms)
      const cm = new Map(chunks.map(c => [c.id, c]))
      const v2l = new Map<number, number>()
      for (const p of pairs) {
        if (p.lexeme_id !== null) {
          if (p.ipf_verb_id !== null) v2l.set(p.ipf_verb_id, p.lexeme_id)
          if (p.pf_verb_id !== null) v2l.set(p.pf_verb_id, p.lexeme_id)
        }
      }

      setVerbsMap(vm)
      setPairsMap(pm)
      setFormsByVerbId(fm)
      setVerbToLexemeId(v2l)
      setPairTranslations(trs)
      setChunksMap(cm)

      // Build draw pool from IndexedDB
      const allItemArrays = await Promise.all(poolIds.map(pid => getPoolItems(pid)))
      // Merge by itemKey, summing weights and collecting sources
      const merged = new Map<string, DrawEntry>()
      for (let i = 0; i < poolIds.length; i++) {
        const pid = poolIds[i]
        for (const item of allItemArrays[i]) {
          const existing = merged.get(item.itemKey)
          if (existing) {
            existing.totalWeight += item.weight
            existing.sources.push({ poolId: pid, itemKey: item.itemKey })
          } else {
            merged.set(item.itemKey, {
              itemKey: item.itemKey,
              totalWeight: item.weight,
              sources: [{ poolId: pid, itemKey: item.itemKey }],
              item,
            })
          }
        }
      }
      setDrawPool([...merged.values()])
      setLoading(false)
    }
    init()
  }, [])

  const generateQuestion = useCallback((
    entry: DrawEntry,
    vm: Map<number, Verb>,
    pm: Map<number, AspectPair>,
    fm: Map<number, VerbFormRead[]>,
    v2l: Map<number, number>,
    trs: PairTranslation[],
    cm: Map<number, Chunk>,
  ): TrainingQuestion | null => {
    const { params } = entry.item

    if (params.kind === 'chunk') {
      const chunk = cm.get(params.chunkId)
      if (!chunk) return null
      const de = chunk.translations.find(t => t.lang === 'de')
      if (!de) return null
      if (params.direction === 'uk→de') {
        return { itemKey: entry.itemKey, sources: entry.sources, promptText: chunk.text, answerText: de.text }
      } else {
        return { itemKey: entry.itemKey, sources: entry.sources, promptText: de.text, answerText: chunk.text }
      }
    }

    if (params.kind === 'verb_translation') {
      const pair = pm.get(params.pairId)
      if (!pair || pair.lexeme_id === null) return null
      const label = [pair.ipf_verb?.accented, pair.pf_verb?.accented].filter(Boolean).join(' / ')
      const deTrs = trs.filter(t => t.lexeme_id === pair.lexeme_id && t.lang === 'de').map(t => t.text).join(', ')
      if (!deTrs) return null
      if (params.direction === 'uk→de') {
        return { itemKey: entry.itemKey, sources: entry.sources, promptText: label, answerText: deTrs, contextLabel: 'German translation' }
      } else {
        return { itemKey: entry.itemKey, sources: entry.sources, promptText: deTrs, answerText: label, contextLabel: 'Ukrainian' }
      }
    }

    // Verb form-based: build restricted fMap for this pair + slot
    const pair = pm.get(params.pairId)
    if (!pair) return null
    const slotSet = new Set([params.slot])

    // For aspect drills, the ipf verb stores present forms as 'present,…' and
    // the pf verb stores the corresponding form as 'future,…'. We need both
    // verbs in fMap for generateAspectQuestion to see them as an eligible pair,
    // so include the cross-tense mirror of the slot alongside the exact slot.
    const mirrorSlot = params.slot.startsWith('present,')
      ? params.slot.replace('present,', 'future,')
      : params.slot.startsWith('future,')
      ? params.slot.replace('future,', 'present,')
      : params.slot
    const slotKeys = params.kind === 'verb_aspect'
      ? new Set([params.slot, mirrorSlot])
      : new Set([params.slot])

    const restrictedFMap = new Map<number, VerbFormRead[]>()
    for (const vid of [pair.ipf_verb_id, pair.pf_verb_id]) {
      if (vid === null) continue
      const forms = fm.get(vid)
      if (!forms) continue
      const filtered = forms.filter(f => slotKeys.has(formSlotKey(f)))
      if (filtered.length > 0) restrictedFMap.set(vid, filtered)
    }

    let q = null
    for (let attempt = 0; attempt < 10; attempt++) {
      if (params.kind === 'verb_aspect') q = generateAspectQuestion(vm, [pair], restrictedFMap, slotSet)
      else if (params.kind === 'verb_infinitive') q = generateInfinitiveQuestion(vm, restrictedFMap, slotSet)
      else if (params.kind === 'verb_number') q = generateNumberQuestion(vm, restrictedFMap, slotSet)
      if (q) break
    }
    if (!q) return null

    return {
      itemKey: entry.itemKey,
      sources: entry.sources,
      promptText: q.prompt,
      promptDisplay: q.display,
      answerText: q.correctForm,
      contextLabel: q.targetFormLabel,
    }
  }, [])

  const drawNext = useCallback((
    pool: DrawEntry[],
    vm: Map<number, Verb>,
    pm: Map<number, AspectPair>,
    fm: Map<number, VerbFormRead[]>,
    v2l: Map<number, number>,
    trs: PairTranslation[],
    cm: Map<number, Chunk>,
  ) => {
    if (pool.length === 0) return
    for (let attempt = 0; attempt < 30; attempt++) {
      const entry = weightedDraw(pool)
      if (!entry) break
      const q = generateQuestion(entry, vm, pm, fm, v2l, trs, cm)
      if (q) {
        setQuestion(q)
        setRevealed(false)
        touchLastSeen(q.itemKey)
        return
      }
    }
  }, [generateQuestion])

  useEffect(() => {
    if (!loading && drawPool.length > 0) {
      drawNext(drawPool, verbsMap, pairsMap, formsByVerbId, verbToLexemeId, pairTranslations, chunksMap)
    }
  }, [loading])

  async function handleRate(rating: -1 | 0 | 1, accent = false) {
    if (!question) return
    await updateWeight(question.sources, rating)
    if (accent) await setAccentFlag(question.itemKey)
    setCount(c => c + 1)
    // Refresh draw-pool weights in memory (approximate — exact values persist in IDB)
    const updated = drawPool.map(e => {
      if (e.itemKey !== question.itemKey || rating === 0) return e
      const w = e.totalWeight
      const newW = rating === -1 ? Math.min(w * 1.4, 4.0) : Math.max(w * 0.75, 0.25)
      return { ...e, totalWeight: newW }
    })
    setDrawPool(updated)
    drawNext(updated, verbsMap, pairsMap, formsByVerbId, verbToLexemeId, pairTranslations, chunksMap)
  }

  const btnStyle: React.CSSProperties = {
    padding: '0.5em 1.5em', fontSize: '1em', borderRadius: '4px',
    border: '1px solid #ddd', cursor: 'pointer', background: '#fff',
  }

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading…</div>
  )

  if (drawPool.length === 0) return (
    <div style={{ padding: '2rem' }}>
      <Link to="/training" style={{ color: '#888', fontSize: '0.9em' }}>← Pools</Link>
      <p style={{ marginTop: '2rem', color: '#888' }}>Selected pools are empty. Add items first.</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to="/training" style={{ color: '#888', fontSize: '0.9em' }}>← Stop</Link>
        <span style={{ color: '#888', fontSize: '0.9em' }}>{count} seen</span>
      </div>

      {question && (
        <div>
          {/* Prompt */}
          <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '2rem' }}>
            {question.promptDisplay ? (
              <div>
                {question.promptDisplay.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: line.bold ? '2rem' : line.small ? '0.9rem' : '1.3rem',
                      fontWeight: line.bold ? 700 : 'normal',
                      color: line.small ? '#888' : '#111',
                      marginBottom: '0.3rem',
                    }}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{question.promptText}</div>
            )}
            {question.contextLabel && !question.promptDisplay && (
              <div style={{ color: '#888', fontSize: '0.9em', marginTop: '0.5rem' }}>→ {question.contextLabel}</div>
            )}
          </div>

          {/* Reveal / Answer */}
          {!revealed ? (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setRevealed(true)}
                style={{ ...btnStyle, padding: '0.6em 2.5em', fontSize: '1.1em', background: '#111', color: '#fff', border: 'none' }}
              >
                Reveal
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '1.5rem', color: '#111' }}>
                {question.answerText}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={() => handleRate(-1)} style={{ ...btnStyle, color: '#c00', borderColor: '#c00', flex: 1 }}>
                  -1
                </button>
                <button onClick={() => handleRate(0)} style={{ ...btnStyle, flex: 1 }}>
                  0
                </button>
                <button onClick={() => handleRate(1)} style={{ ...btnStyle, color: '#080', borderColor: '#080', flex: 1 }}>
                  +1
                </button>
                <button
                  onClick={() => handleRate(1, true)}
                  style={{ ...btnStyle, flex: 1.5, fontSize: '0.9em', color: '#555', background: '#f5f5f5' }}
                  title="Knew it, but stress is uncertain — flags for future stress review"
                >
                  наголос
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

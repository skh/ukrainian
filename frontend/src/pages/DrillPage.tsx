import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { api } from '../api/client'
import { stripAccent } from '../utils/forms'
import { Verb, Tag, PairTranslation, AspectPair, VerbFormRead, Chunk, ChunkLink, Entry } from '../types'
import { aspectBg } from '../utils/theme'
import { FormsTable } from '../components/FormsTable'
import { TagPicker } from '../widgets/TagPicker'
import { TagChip } from '../widgets/TagChip'
import {
  pickRandom,
  generateAspectQuestion,
  generateInfinitiveQuestion,
  generateNumberQuestion,
  generateTranslationQuestion,
  Question,
  PromptLine,
} from '../utils/drillGenerators'


type Phase = 'select' | 'asking' | 'revealing' | 'reviewing' | 'summary'

interface ChunkQuestion {
  chunkId: number
  prompt: string
  promptLang: string
  answer: string
  answerLang: string
  notes: string | null
}

function isChunkQ(q: Question | ChunkQuestion): q is ChunkQuestion {
  return 'chunkId' in q
}

interface HistoryEntry {
  prompt: string
  userAnswer: string
  correctAnswer: string
  correct: boolean
  stressOnly?: boolean
  pairId?: number
  isChunk?: boolean
}

function ParadigmHint({ verb, forms, translations, partnerVerb, partnerForms }: {
  verb: Verb
  forms: VerbFormRead[]
  translations: PairTranslation[]
  partnerVerb?: Verb
  partnerForms?: VerbFormRead[]
}) {
  const [show, setShow] = useState(false)
  const [showPartner, setShowPartner] = useState(false)

  const displayVerb = showPartner && partnerVerb ? partnerVerb : verb
  const displayForms = showPartner && partnerVerb ? (partnerForms ?? []) : forms
  const displayAspect = displayVerb.aspect

  const byLang = translations.reduce<Record<string, string[]>>((acc, t) => {
    ;(acc[t.lang] ??= []).push(t.text)
    return acc
  }, {})

  const triangleStyle: React.CSSProperties = {
    cursor: 'pointer', userSelect: 'none', color: '#555', padding: '0 0.3em',
  }

  const triangle = partnerVerb ? (
    displayAspect === 'ipf'
      ? <span style={triangleStyle} onClick={() => setShowPartner(s => !s)}>▶</span>
      : <span style={triangleStyle} onClick={() => setShowPartner(s => !s)}>◀</span>
  ) : null

  return createPortal(
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 9999 }}>
      {show && (
        <div style={{
          position: 'absolute', bottom: '2.5rem', right: 0,
          background: aspectBg[displayAspect], border: '1px solid #ccc', borderRadius: '4px',
          padding: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '70%', maxWidth: '90vw',
        }}>
          <div>
            {displayAspect === 'pf' && triangle}
            <strong>{displayVerb.accented}</strong>
            {' '}<span style={{ color: '#888' }}>({displayVerb.aspect})</span>
            {displayAspect === 'ipf' && triangle}
          </div>
          {Object.entries(byLang).map(([lang, texts]) => (
            <div key={lang} style={{ color: '#555', marginTop: '0.2em' }}>
              {lang}: {texts.join(', ')}
            </div>
          ))}
          <div style={{ marginTop: '0.5rem' }}>
            <FormsTable forms={displayForms} />
          </div>
        </div>
      )}
      <div
        onClick={() => { if (show) setShowPartner(false); setShow(s => !s) }}
        style={{
          width: '1.8rem', height: '1.8rem',
          border: '2px solid #666', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '1rem', color: '#444',
          background: 'white', userSelect: 'none',
        }}
      >
        ?
      </div>
    </div>,
    document.body,
  )
}

function renderPrompt(q: Question) {
  if (q.display) {
    return (
      <div style={{ marginBottom: '0.75em' }}>
        {q.display.map((line: PromptLine, i: number) =>
          line.small ? (
            <p key={i} style={{ fontSize: '0.85em', color: '#666', margin: '0.15em 0 0' }}>
              {line.text}
            </p>
          ) : (
            <p key={i} style={{ margin: '0.2em 0' }}>
              {line.bold ? <strong>{line.text}</strong> : line.text}
            </p>
          )
        )}
      </div>
    )
  }
  return <p><strong>{q.prompt}</strong></p>
}

function VerbPairPopup({ pairId, verbs, pairs, formsByVerbId, pairTranslations }: {
  pairId: number
  verbs: Verb[]
  pairs: AspectPair[]
  formsByVerbId: Map<number, VerbFormRead[]>
  pairTranslations: PairTranslation[]
}) {
  const [showPartner, setShowPartner] = useState(false)

  const pair = pairs.find(p => p.id === pairId)
  if (!pair) return null
  const primaryVerbId = pair.ipf_verb_id ?? pair.pf_verb_id
  if (primaryVerbId == null) return null
  const primaryVerb = verbs.find(v => v.id === primaryVerbId)
  if (!primaryVerb) return null

  const partnerVerbId = primaryVerb.aspect === 'ipf' ? pair.pf_verb_id : pair.ipf_verb_id
  const partnerVerb = partnerVerbId != null ? verbs.find(v => v.id === partnerVerbId) : undefined

  const displayVerb = showPartner && partnerVerb ? partnerVerb : primaryVerb
  const displayForms = formsByVerbId.get(displayVerb.id) ?? []
  const displayAspect = displayVerb.aspect

  const translations = pairTranslations.filter(t => t.pair_id === pairId)
  const byLang = translations.reduce<Record<string, string[]>>((acc, t) => {
    ;(acc[t.lang] ??= []).push(t.text); return acc
  }, {})

  const triangleStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', color: '#555', padding: '0 0.3em' }
  const triangle = partnerVerb ? (
    displayAspect === 'ipf'
      ? <span style={triangleStyle} onClick={() => setShowPartner(s => !s)}>▶</span>
      : <span style={triangleStyle} onClick={() => setShowPartner(s => !s)}>◀</span>
  ) : null

  return (
    <div style={{ background: aspectBg[displayAspect], border: '1px solid #ccc', borderRadius: '4px', padding: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '70%', maxWidth: '90vw' }}>
      <div>
        {displayAspect === 'pf' && triangle}
        <strong>{displayVerb.accented}</strong>
        {' '}<span style={{ color: '#888' }}>({displayVerb.aspect})</span>
        {displayAspect === 'ipf' && triangle}
      </div>
      {Object.entries(byLang).map(([lang, texts]) => (
        <div key={lang} style={{ color: '#555', marginTop: '0.2em' }}>{lang}: {texts.join(', ')}</div>
      ))}
      <div style={{ marginTop: '0.5rem' }}><FormsTable forms={displayForms} /></div>
    </div>
  )
}

function ChunkLinksHint({ links, verbs, pairs, formsByVerbId, pairTranslations }: {
  links: ChunkLink[]
  verbs: Verb[]
  pairs: AspectPair[]
  formsByVerbId: Map<number, VerbFormRead[]>
  pairTranslations: PairTranslation[]
}) {
  const [openId, setOpenId] = useState<number | null>(null)
  const [nounCache, setNounCache] = useState<Map<number, Entry>>(new Map())

  const relevant = links.filter(l => l.pair_id || l.entry_id)
  if (relevant.length === 0) return null

  async function toggle(link: ChunkLink) {
    if (openId === link.id) { setOpenId(null); return }
    setOpenId(link.id)
    if (link.entry_id && link.lexeme_pos === 'noun' && !nounCache.has(link.entry_id)) {
      const entry = await api.get<Entry>(`/nouns/${link.entry_id}`)
      setNounCache(prev => new Map(prev).set(link.entry_id!, entry))
    }
  }

  const openLink = relevant.find(l => l.id === openId)

  function renderNounPopup(entry: Entry) {
    const hasSg = entry.number_type !== 'pl'
    const hasPl = entry.number_type !== 'sg'
    const cases = ['nom', 'gen', 'dat', 'acc', 'ins', 'loc', 'voc']
    const labels: Record<string, string> = { nom: 'Н', gen: 'Р', dat: 'Д', acc: 'З', ins: 'О', loc: 'М', voc: 'К' }
    return (
      <div style={{ background: '#f8f8f8', border: '1px solid #ccc', borderRadius: '4px', padding: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '70%', maxWidth: '90vw' }}>
        <div><strong>{entry.accented}</strong>{entry.gender && <span style={{ color: '#888', marginLeft: '0.5em' }}>({entry.gender})</span>}</div>
        <table style={{ marginTop: '0.5rem', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th></th>
            {hasSg && <th style={{ paddingLeft: '0.5em', fontWeight: 'normal', color: '#888' }}>одн.</th>}
            {hasPl && <th style={{ paddingLeft: '0.5em', fontWeight: 'normal', color: '#888' }}>мн.</th>}
          </tr></thead>
          <tbody>
            {cases.map(c => {
              const sg = entry.forms?.find(f => f.tags.includes(c) && f.tags.includes('sg'))?.form
              const pl = entry.forms?.find(f => f.tags.includes(c) && f.tags.includes('pl'))?.form
              if (!sg && !pl) return null
              return (
                <tr key={c}>
                  <td style={{ color: '#888', paddingRight: '0.5em' }}>{labels[c]}</td>
                  {hasSg && <td style={{ paddingLeft: '0.5em' }}>{sg ?? '—'}</td>}
                  {hasPl && <td style={{ paddingLeft: '0.5em' }}>{pl ?? '—'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 9999 }}>
      {openLink && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0 }}>
          {openLink.pair_id
            ? <VerbPairPopup pairId={openLink.pair_id} verbs={verbs} pairs={pairs} formsByVerbId={formsByVerbId} pairTranslations={pairTranslations} />
            : openLink.entry_id && nounCache.has(openLink.entry_id)
            ? renderNounPopup(nounCache.get(openLink.entry_id)!)
            : <div style={{ fontSize: '0.8em', color: '#888', background: 'white', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem' }}>Loading…</div>
          }
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
        {relevant.map(link => {
          const isVerb = !!link.pair_id
          const nounColor = link.entry_gender === 'm' ? '#cc2200'
            : link.entry_gender === 'f' ? '#1166cc'
            : link.entry_gender === 'n' ? '#228833'
            : '#555'
          const pairParts = isVerb && link.pair_label ? link.pair_label.split(' / ') : null
          return (
            <button
              key={link.id}
              onClick={() => toggle(link)}
              style={{
                fontSize: '0.75em',
                fontStyle: 'italic',
                padding: '0.15em 0.6em',
                borderRadius: '1em',
                border: '1px solid #ccc',
                background: 'white',
                color: isVerb ? undefined : nounColor,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {pairParts ? (
                <>
                  <span style={{ color: '#2266bb' }}>{pairParts[0]}</span>
                  {pairParts[1] && <><span style={{ color: '#ccc' }}> / </span><span style={{ color: '#c8b800' }}>{pairParts[1]}</span></>}
                </>
              ) : (
                link.pair_label ?? link.lexeme_form ?? '?'
              )}
            </button>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}

export default function DrillPage() {
  const [phase, setPhase] = useState<Phase>('select')
  const [typeIn, setTypeIn] = useState(true)
  const [useAspect, setUseAspect] = useState(true)
  const [useInfinitive, setUseInfinitive] = useState(true)
  const [useNumber, setUseNumber] = useState(true)
  const [useTranslation, setUseTranslation] = useState(true)
  const [verbScope, setVerbScope] = useState<'all' | 'selection' | 'tag'>('all')
  const [selectedPairIds, setSelectedPairIds] = useState<Set<number>>(new Set())
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)

  // chunk settings
  const [allChunks, setAllChunks] = useState<Chunk[]>([])
  const [chunkLang, setChunkLang] = useState('de')
  const [chunkTagId, setChunkTagId] = useState<number | null>(null)
  const [useChunkTypeA, setUseChunkTypeA] = useState(true)
  const [useChunkTypeB, setUseChunkTypeB] = useState(true)
  const [chunkLangs, setChunkLangs] = useState<string[]>([])

  const [verbs, setVerbs] = useState<Verb[]>([])
  const [pairs, setPairs] = useState<AspectPair[]>([])
  const [formsByVerbId, setFormsByVerbId] = useState<Map<number, VerbFormRead[]>>(new Map())
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [pairTags, setPairTags] = useState<Array<{ pair_id: number; tag_id: number }>>([])
  const [pairTranslations, setPairTranslations] = useState<PairTranslation[]>([])
  const [verbToPairId, setVerbToPairId] = useState<Map<number, number>>(new Map())

  const [drillMode, setDrillMode] = useState<'verbs' | 'chunks' | 'mixed'>('verbs')
  const [reDrillMode, setReDrillMode] = useState(false)
  const [question, setQuestion] = useState<Question | ChunkQuestion | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)
  const newDrillRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    Promise.all([
      api.get<Verb[]>('/verbs'),
      api.get<AspectPair[]>('/aspect-pairs'),
      api.get<VerbFormRead[]>('/verb-forms'),
      api.get<Tag[]>('/tags'),
      api.get<Array<{ pair_id: number; tag_id: number }>>('/pair-tags'),
      api.get<PairTranslation[]>('/pair-translations'),
      api.get<Chunk[]>('/chunks'),
    ]).then(([vs, ps, fs, tags, pts, trs, chunks]) => {
      setVerbs(vs)
      setPairs(ps)
      const map = new Map<number, VerbFormRead[]>()
      for (const f of fs) {
        const arr = map.get(f.verb_id) ?? []
        arr.push(f)
        map.set(f.verb_id, arr)
      }
      setFormsByVerbId(map)
      setAllTags(tags)
      setPairTags(pts)
      setPairTranslations(trs)
      const v2p = new Map<number, number>()
      for (const p of ps) {
        if (p.ipf_verb_id !== null) v2p.set(p.ipf_verb_id, p.id)
        if (p.pf_verb_id !== null) v2p.set(p.pf_verb_id, p.id)
      }
      setVerbToPairId(v2p)
      const drillable = chunks.filter(c => c.translations.length > 0)
      setAllChunks(drillable)
      const langs = [...new Set(drillable.flatMap(c => c.translations.map(t => t.lang)))]
      setChunkLangs(langs)
      if (langs.length > 0 && !langs.includes(chunkLang)) setChunkLang(langs[0])
    })
  }, [])

  function getFilteredData(scopeOverride?: 'all' | 'selection' | 'tag', pairIdsOverride?: Set<number>) {
    const scope = scopeOverride ?? verbScope
    const pairIds = pairIdsOverride ?? selectedPairIds
    const verbsMap = new Map(verbs.map(v => [v.id, v]))
    if (scope === 'all') {
      return { verbsMap, filteredPairs: pairs, filteredForms: formsByVerbId }
    }
    if (scope === 'tag') {
      const allowedPairIds = new Set(
        pairTags.filter(pt => pt.tag_id === selectedTagId).map(pt => pt.pair_id)
      )
      const filteredPairs = pairs.filter(p => allowedPairIds.has(p.id))
      const allowedVerbIds = new Set(filteredPairs.flatMap(p => [p.ipf_verb_id, p.pf_verb_id]))
      const filteredForms = new Map([...formsByVerbId].filter(([id]) => allowedVerbIds.has(id)))
      return { verbsMap, filteredPairs, filteredForms }
    }
    const filteredPairs = pairs.filter(p => pairIds.has(p.id))
    const allowedVerbIds = new Set(filteredPairs.flatMap(p => [p.ipf_verb_id, p.pf_verb_id]))
    const filteredForms = new Map([...formsByVerbId].filter(([id]) => allowedVerbIds.has(id)))
    return { verbsMap, filteredPairs, filteredForms }
  }

  function getChunkPool(): Chunk[] {
    const pool = chunkTagId !== null
      ? allChunks.filter(c => c.tags.some(t => t.id === chunkTagId))
      : allChunks
    return pool.filter(c => c.translations.some(t => t.lang === chunkLang))
  }

  function pickQuestion(scopeOverride?: 'all' | 'selection' | 'tag', pairIdsOverride?: Set<number>): Question | null {
    const { verbsMap, filteredPairs, filteredForms } = getFilteredData(scopeOverride, pairIdsOverride)
    const types = [
      ...(useAspect ? ['aspect'] : []),
      ...(useInfinitive ? ['infinitive'] : []),
      ...(useNumber ? ['number'] : []),
      ...(useTranslation ? ['translation'] : []),
    ]
    if (types.length === 0) return null
    for (let attempts = 0; attempts < 20; attempts++) {
      const type = pickRandom(types)
      const q = type === 'aspect'
        ? generateAspectQuestion(verbsMap, filteredPairs, filteredForms)
        : type === 'infinitive'
        ? generateInfinitiveQuestion(verbsMap, filteredForms)
        : type === 'number'
        ? generateNumberQuestion(verbsMap, filteredForms)
        : generateTranslationQuestion(verbsMap, filteredForms, verbToPairId, pairTranslations)
      if (q) return q
    }
    return null
  }

  function pickChunkQuestion(): ChunkQuestion | null {
    const types = [
      ...(useChunkTypeA ? ['A'] : []),
      ...(useChunkTypeB ? ['B'] : []),
    ]
    if (types.length === 0) return null
    const pool = getChunkPool()
    if (pool.length === 0) return null
    for (let i = 0; i < 20; i++) {
      const chunk = pickRandom(pool)
      const trans = chunk.translations.filter(t => t.lang === chunkLang)
      if (trans.length === 0) continue
      const t = pickRandom(trans)
      const type = pickRandom(types) as 'A' | 'B'
      if (type === 'A') {
        return { chunkId: chunk.id, prompt: chunk.text, promptLang: chunk.lang, answer: t.text, answerLang: chunkLang, notes: chunk.notes }
      } else {
        return { chunkId: chunk.id, prompt: t.text, promptLang: chunkLang, answer: chunk.text, answerLang: chunk.lang, notes: chunk.notes }
      }
    }
    return null
  }

  function pickNextQuestion(): Question | ChunkQuestion | null {
    const verbTypes = [
      ...(useAspect ? ['aspect'] : []),
      ...(useInfinitive ? ['infinitive'] : []),
      ...(useNumber ? ['number'] : []),
      ...(useTranslation ? ['translation'] : []),
    ]
    const canVerb = drillMode !== 'chunks' && verbTypes.length > 0 && getFilteredData().filteredPairs.length > 0
    const canChunk = drillMode !== 'verbs' && (useChunkTypeA || useChunkTypeB) && getChunkPool().length > 0
    if (!canVerb && !canChunk) return null
    if (!canVerb) return pickChunkQuestion()
    if (!canChunk) return pickQuestion()
    return Math.random() < 0.5
      ? (pickQuestion() ?? pickChunkQuestion())
      : (pickChunkQuestion() ?? pickQuestion())
  }

  function nextQuestion() {
    const q = reDrillMode ? pickQuestion() : pickNextQuestion()
    if (!q) return
    setQuestion(q)
    setUserAnswer('')
    if (typeIn && !isChunkQ(q)) setTimeout(() => inputRef.current?.focus(), 50)
  }

  function startDrill() {
    setReDrillMode(false)
    setHistory([])
    setPhase('asking')
    const q = pickNextQuestion()
    if (!q) return
    setQuestion(q)
    setUserAnswer('')
    if (typeIn && !isChunkQ(q)) setTimeout(() => inputRef.current?.focus(), 50)
  }

  function submitAnswer() {
    if (!question || isChunkQ(question)) return
    const trimmed = userAnswer.trim()
    const hasUppercase = /\p{Lu}/u.test(trimmed)
    const correct = hasUppercase
      ? trimmed.replace(/\p{Lu}/gu, c => c.toLowerCase() + '\u0301') === question.correctForm
      : stripAccent(trimmed.toLowerCase()) === stripAccent(question.correctForm.toLowerCase())
    const entry: HistoryEntry = {
      prompt: question.prompt,
      userAnswer: trimmed,
      correctAnswer: question.correctForm,
      correct,
      pairId: verbToPairId.get(question.verbId),
    }
    setHistory(prev => [...prev, entry])
    setPhase('reviewing')
    setTimeout(() => continueRef.current?.focus(), 50)
  }

  function recordFlashcard(correct: boolean, stressOnly?: boolean) {
    if (!question) return
    const entry: HistoryEntry = isChunkQ(question)
      ? { prompt: question.prompt, userAnswer: '', correctAnswer: question.answer, correct, stressOnly, isChunk: true }
      : { prompt: question.prompt, userAnswer: '', correctAnswer: question.correctForm, correct, stressOnly, pairId: verbToPairId.get(question.verbId) }
    setHistory(prev => [...prev, entry])
    setPhase('asking')
    nextQuestion()
  }

  async function addTagToCurrentItem(tagName: string) {
    if (!question) return
    const tag = await api.post<Tag>('/tags', { name: tagName })
    if (!allTags.some(t => t.id === tag.id))
      setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
    if (isChunkQ(question)) {
      await api.post(`/chunks/${question.chunkId}/tags/${tag.id}`, {})
      setAllChunks(prev => prev.map(c =>
        c.id === question.chunkId && !c.tags.some(t => t.id === tag.id)
          ? { ...c, tags: [...c.tags, tag] }
          : c
      ))
    } else {
      const pairId = verbToPairId.get(question.verbId)
      if (pairId) {
        await api.post(`/pairs/${pairId}/tags/${tag.id}`, {})
        setPairTags(prev => prev.some(pt => pt.pair_id === pairId && pt.tag_id === tag.id)
          ? prev
          : [...prev, { pair_id: pairId, tag_id: tag.id }]
        )
      }
    }
  }

  function endDrill() {
    setPhase('summary')
    setTimeout(() => newDrillRef.current?.focus(), 50)
  }

  function reDrillWrong() {
    const wrongPairIds = new Set(
      history.filter(h => !h.correct && !h.stressOnly && h.pairId != null).map(h => h.pairId!)
    )
    setSelectedPairIds(wrongPairIds)
    setVerbScope('selection')
    setReDrillMode(true)
    setHistory([])
    setPhase('asking')
    const q = pickQuestion('selection', wrongPairIds)
    if (q) {
      setQuestion(q)
      setUserAnswer('')
      if (typeIn) setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function continueOrEnd(end: boolean) {
    if (end) {
      endDrill()
    } else {
      setPhase('asking')
      nextQuestion()
    }
  }

  function renderTranslations(pairId: number | undefined) {
    if (!pairId) return null
    const ts = pairTranslations.filter(t => t.pair_id === pairId)
    if (ts.length === 0) return null
    const byLang = ts.reduce<Record<string, string[]>>((acc, t) => {
      ;(acc[t.lang] ??= []).push(t.text)
      return acc
    }, {})
    return (
      <div style={{ color: '#666', fontSize: '0.9em', margin: '0.5em 0 1em', border: '1px solid #ccc', borderRadius: '3px', padding: '0.3em 0.6em' }}>
        {Object.entries(byLang).map(([lang, texts]) => (
          <span key={lang} style={{ marginRight: '1em' }}>
            <span style={{ color: '#aaa' }}>{lang}</span>{' '}{texts.join(', ')}
          </span>
        ))}
      </div>
    )
  }

  if (phase === 'select') {
    const verbsMap = new Map(verbs.map(v => [v.id, v]))
    const sortedPairs = [...pairs].sort((a, b) => {
      const aKey = stripAccent(verbsMap.get(a.ipf_verb_id ?? -1)?.accented ?? '')
      const bKey = stripAccent(verbsMap.get(b.ipf_verb_id ?? -1)?.accented ?? '')
      return aKey.localeCompare(bKey, 'uk')
    })
    const noneSelected = (verbScope === 'selection' && selectedPairIds.size === 0)
      || (verbScope === 'tag' && selectedTagId === null)
    const verbEnabled = drillMode !== 'chunks' && (useAspect || useInfinitive || useNumber || useTranslation) && !noneSelected
    const chunkEnabled = drillMode !== 'verbs' && (useChunkTypeA || useChunkTypeB)
    const canStart = verbEnabled || chunkEnabled
    const showVerbs = drillMode === 'verbs' || drillMode === 'mixed'
    const showChunks = drillMode === 'chunks' || drillMode === 'mixed'
    return (
      <div>
        <Nav />
        <h1>Drills</h1>
        <br />
        <div>
          <label>
            <input type="radio" checked={drillMode === 'verbs'} onChange={() => setDrillMode('verbs')} />{' '}
            Verbs
          </label>
          {'  '}
          <label>
            <input type="radio" checked={drillMode === 'chunks'} onChange={() => setDrillMode('chunks')} />{' '}
            Chunks
          </label>
          {'  '}
          <label>
            <input type="radio" checked={drillMode === 'mixed'} onChange={() => setDrillMode('mixed')} />{' '}
            Mixed
          </label>
        </div>
        <br />
        {showVerbs && (
        <div>
          <label>
            <input type="radio" checked={typeIn} onChange={() => setTypeIn(true)} />{' '}
            Type in answers
          </label>
          <br />
          <label>
            <input type="radio" checked={!typeIn} onChange={() => setTypeIn(false)} />{' '}
            Show answer (flashcard)
          </label>
        </div>
        )}
        {showVerbs && <br />}
        {showVerbs && <strong>Verbs</strong>}
        {showVerbs && (
        <div style={{ marginTop: '0.4rem' }}>
          <label>
            <input type="checkbox" checked={useAspect} onChange={e => setUseAspect(e.target.checked)} />{' '}
            Aspect form drill
          </label>
          <br />
          <label>
            <input type="checkbox" checked={useInfinitive} onChange={e => setUseInfinitive(e.target.checked)} />{' '}
            Infinitive → form drill
          </label>
          <br />
          <label>
            <input type="checkbox" checked={useNumber} onChange={e => setUseNumber(e.target.checked)} />{' '}
            Singular/plural drill
          </label>
          <br />
          <label>
            <input type="checkbox" checked={useTranslation} onChange={e => setUseTranslation(e.target.checked)} />{' '}
            Translation → form drill (de, present/future only)
          </label>
        </div>
        )}
        {showVerbs && (
        <div style={{ marginTop: '0.5rem' }}>
          <label>
            <input type="radio" checked={verbScope === 'all'} onChange={() => setVerbScope('all')} />{' '}
            All verbs
          </label>
          <br />
          <label>
            <input type="radio" checked={verbScope === 'selection'} onChange={() => setVerbScope('selection')} />{' '}
            Selection
          </label>
          <br />
          <label>
            <input type="radio" checked={verbScope === 'tag'} onChange={() => setVerbScope('tag')} />{' '}
            By tag
          </label>
        </div>
        )}
        {showVerbs && verbScope === 'tag' && (
          <div style={{ marginTop: '0.5rem' }}>
            <select
              value={selectedTagId ?? ''}
              onChange={e => setSelectedTagId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— pick a tag —</option>
              {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        {showVerbs && verbScope === 'selection' && (
          <div style={{ marginTop: '0.5rem' }}>
            <button onClick={() => setSelectedPairIds(new Set(pairs.map(p => p.id)))}>Select all</button>
            {' '}
            <button onClick={() => setSelectedPairIds(new Set())}>Select none</button>
            <div style={{ marginTop: '0.5rem', lineHeight: '1.8' }}>
              {sortedPairs.map(p => {
                const ipf = p.ipf_verb_id != null ? verbsMap.get(p.ipf_verb_id) : undefined
                const pf = p.pf_verb_id != null ? verbsMap.get(p.pf_verb_id) : undefined
                if (!ipf || !pf) return null
                return (
                  <label key={p.id} style={{ display: 'block' }}>
                    <input
                      type="checkbox"
                      checked={selectedPairIds.has(p.id)}
                      onChange={() => {
                        setSelectedPairIds(prev => {
                          const next = new Set(prev)
                          next.has(p.id) ? next.delete(p.id) : next.add(p.id)
                          return next
                        })
                      }}
                    />{' '}
                    {ipf.accented} / {pf.accented}
                  </label>
                )
              })}
            </div>
          </div>
        )}
        {showVerbs && showChunks && <hr style={{ margin: '1.25rem 0' }} />}
        {showChunks && (
          <div>
            <strong>Chunks</strong>
            <div style={{ marginTop: '0.5rem', marginBottom: '0.4rem' }}>
              <label>
                Other language:{' '}
                <select value={chunkLang} onChange={e => setChunkLang(e.target.value)}>
                  {chunkLangs.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            </div>
            <div style={{ marginBottom: '0.4rem' }}>
              <label>
                Tag filter:{' '}
                <select value={chunkTagId ?? ''} onChange={e => setChunkTagId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— all chunks —</option>
                  {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            </div>
            <label>
              <input type="checkbox" checked={useChunkTypeA} onChange={e => setUseChunkTypeA(e.target.checked)} />{' '}
              Show Ukrainian → translate to {chunkLang}
            </label>
            <br />
            <label>
              <input type="checkbox" checked={useChunkTypeB} onChange={e => setUseChunkTypeB(e.target.checked)} />{' '}
              Show {chunkLang} → give the original
            </label>
          </div>
        )}
        <br />
        <button className="btn-primary" onClick={startDrill} disabled={!canStart}>
          Start
        </button>
      </div>
    )
  }

  if (phase === 'asking') {
    const isChunk = question && isChunkQ(question)
    return (
      <div>
        <h1>Drills</h1>
        <p style={{ color: '#666' }}>Question {history.length + 1}</p>
        {question && (
          <>
            {isChunk ? (
              <>
                <p style={{ fontSize: '0.85em', color: '#666', margin: '1.5em 0 0.15em' }}>
                  [{question.promptLang}] → [{question.answerLang}]
                </p>
                <p style={{ margin: '0.2em 0 1.5em' }}><strong>{question.prompt}</strong></p>
                <button className="btn-primary" onClick={() => setPhase('revealing')}>Show answer</button>
              </>
            ) : (
              <>
                {renderPrompt(question)}
                {question.type !== 'translation' && renderTranslations(verbToPairId.get(question.verbId))}
                {typeIn ? (
                  <>
                    <input
                      ref={inputRef}
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitAnswer() }}
                      placeholder="Type your answer..."
                    />
                    {' '}
                    <button className="btn-primary" onClick={submitAnswer}>Submit</button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={() => setPhase('revealing')}>Show answer</button>
                )}
              </>
            )}
          </>
        )}
        {(!typeIn || isChunk) && (
          <div style={{ marginTop: '1rem' }}>
            <button onClick={endDrill}>End drill</button>
          </div>
        )}
      </div>
    )
  }

  function paradigmHint(verbId: number, targetVerbId?: number) {
    const hintVerbId = targetVerbId ?? verbId
    const verb = verbs.find(v => v.id === hintVerbId)
    if (!verb) return null
    const forms = formsByVerbId.get(hintVerbId) ?? []
    const pairId = verbToPairId.get(hintVerbId)
    const translations = pairId ? pairTranslations.filter(t => t.pair_id === pairId) : []
    const pair = pairs.find(p => p.id === pairId)
    const partnerVerbId = pair
      ? (verb.aspect === 'ipf' ? pair.pf_verb_id : pair.ipf_verb_id)
      : null
    const partnerVerb = partnerVerbId ? verbs.find(v => v.id === partnerVerbId) : undefined
    const partnerForms = partnerVerbId ? (formsByVerbId.get(partnerVerbId) ?? []) : undefined
    return (
      <ParadigmHint
        verb={verb} forms={forms} translations={translations}
        partnerVerb={partnerVerb} partnerForms={partnerForms}
      />
    )
  }

  if (phase === 'revealing') {
    const isChunk = question && isChunkQ(question)
    const vq = !isChunk ? question as Question : null
    return (
      <div style={{ background: vq ? aspectBg[vq.aspect] : undefined }}>
        <h1>Drills</h1>
        <p style={{ color: '#666' }}>Question {history.length + 1}</p>
        {question && (
          isChunk ? (
            <>
              <p style={{ fontSize: '0.85em', color: '#666', margin: '0.15em 0 0' }}>[{question.promptLang}]</p>
              <p style={{ margin: '0.2em 0' }}><strong>{question.prompt}</strong></p>
              <p>Answer: <strong>{question.answer}</strong></p>
              {question.notes && (
                <p style={{ fontSize: '0.85em', color: '#666', margin: '0.15em 0 0' }}>Note: {question.notes}</p>
              )}
            </>
          ) : vq && (
            <>
              {renderPrompt(vq)}
              <p>Answer: <strong>{vq.correctForm}</strong></p>
              {vq.targetFormLabel && (
                <p style={{ fontSize: '0.85em', color: '#666', margin: '0.15em 0 0' }}>{vq.targetFormLabel}</p>
              )}
              {renderTranslations(verbToPairId.get(vq.verbId))}
            </>
          )
        )}
        <button
          style={{ background: 'green', color: 'white', padding: '8px 24px', fontSize: '1em' }}
          onClick={() => recordFlashcard(true)}
        >
          Ok
        </button>
        {' '}
        <button
          style={{ background: '#c8a800', color: 'white', padding: '8px 24px', fontSize: '1em' }}
          onClick={() => recordFlashcard(true, true)}
        >
          наголос
        </button>
        {' '}
        <button
          style={{ background: '#c00', color: 'white', padding: '8px 24px', fontSize: '1em' }}
          onClick={() => recordFlashcard(false)}
        >
          Didn't know
        </button>
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8em', color: '#888' }}>Tags:</span>
          {question && isChunkQ(question)
            ? allChunks.find(c => c.id === question.chunkId)?.tags.map(t => <TagChip key={t.id} tag={t} />)
            : vq && pairTags.filter(pt => pt.pair_id === verbToPairId.get(vq.verbId)).map(pt => allTags.find(t => t.id === pt.tag_id)).filter(Boolean).map(t => <TagChip key={t!.id} tag={t!} />)
          }
          <TagPicker
            allTags={allTags}
            assignedTagIds={question && isChunkQ(question)
              ? new Set(allChunks.find(c => c.id === question.chunkId)?.tags.map(t => t.id) ?? [])
              : new Set(vq ? pairTags.filter(pt => pt.pair_id === verbToPairId.get(vq.verbId)).map(pt => pt.tag_id) : [])
            }
            onAdd={addTagToCurrentItem}
          />
        </div>
        <br />
        <button onClick={endDrill}>End drill</button>
        {vq && paradigmHint(vq.verbId, vq.targetVerbId)}
        {isChunk && question && (() => {
          const chunk = allChunks.find(c => c.id === (question as ChunkQuestion).chunkId)
          return chunk && chunk.links.length > 0
            ? <ChunkLinksHint links={chunk.links} verbs={verbs} pairs={pairs} formsByVerbId={formsByVerbId} pairTranslations={pairTranslations} />
            : null
        })()}
      </div>
    )
  }

  if (phase === 'reviewing') {
    const vq = question as Question
    const last = history[history.length - 1]
    return (
      <div style={{ background: vq ? aspectBg[vq.aspect] : undefined }}>
        <h1>Drills</h1>
        <p style={{ color: '#666' }}>Question {history.length}</p>
        <p><strong>{last.prompt}</strong></p>
        <p>
          Your answer: <strong>{last.correct ? last.correctAnswer : (last.userAnswer || '(empty)')}</strong>{' '}
          <span style={{ color: last.correct ? 'green' : 'red' }}>{last.correct ? '✓' : '✗'}</span>
        </p>
        {!last.correct && (
          <p>Correct answer: <strong>{last.correctAnswer}</strong></p>
        )}
        {renderTranslations(last.pairId)}
        <br />
        <button className="btn-primary" onClick={() => continueOrEnd(false)} ref={continueRef}>Continue</button>
        {' '}
        <button onClick={() => continueOrEnd(true)}>End drill</button>
        {vq && paradigmHint(vq.verbId, vq.targetVerbId)}
      </div>
    )
  }

  // summary
  const score = history.filter(h => h.correct).length
  return (
    <div>
      <h1>Drill Summary</h1>
      <p>
        Score: <strong>{score} / {history.length}</strong>
        {history.length > 0 && ` (${Math.round((score / history.length) * 100)}%)`}
      </p>
      <br />
      <div style={{ overflowX: 'auto' }}><table>
        <thead>
          <tr>
            <th>Question</th>
            {typeIn && <th>Your answer</th>}
            <th>Correct answer</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i} style={{ background: h.stressOnly ? '#fff9c4' : h.correct ? '#d4edda' : '#f8d7da' }}>
              <td>{h.isChunk ? <em>{h.prompt}</em> : h.prompt}</td>
              {typeIn && <td>{h.userAnswer || '(empty)'}</td>}
              <td>{h.correctAnswer}</td>
              <td><span style={{ color: h.stressOnly ? '#c8a800' : h.correct ? 'green' : 'red' }}>{h.stressOnly ? '~' : h.correct ? '✓' : '✗'}</span></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <br />
      <button className="btn-primary" onClick={() => { setPhase('select'); setHistory([]) }} ref={newDrillRef}>
        New drill
      </button>
      {history.some(h => !h.correct && !h.stressOnly && h.pairId != null) && (
        <>
          {' '}
          <button onClick={reDrillWrong}>Re-drill wrong verbs</button>
        </>
      )}
      {' '}
      <Link to="/">← Verbs</Link>
    </div>
  )
}

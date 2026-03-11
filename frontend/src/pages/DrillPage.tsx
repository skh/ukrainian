import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { stripAccent } from '../utils/forms'
import { VerbFormData } from '../utils/gorohParser'
import { Verb, Tag, PairTranslation } from '../types'
import { aspectBg } from '../utils/theme'
import { FormsTable } from '../components/FormsTable'
import {
  pickRandom,
  generateAspectQuestion,
  generateInfinitiveQuestion,
  generateNumberQuestion,
  generateTranslationQuestion,
  Question,
  PromptLine,
} from '../utils/drillGenerators'

interface AspectPair {
  id: number
  ipf_verb_id: number
  pf_verb_id: number
}

interface VerbForm {
  id: number
  verb_id: number
  tense: VerbFormData['tense']
  person: VerbFormData['person']
  number: VerbFormData['number']
  gender: VerbFormData['gender']
  form: string
}

type Phase = 'select' | 'asking' | 'revealing' | 'reviewing' | 'summary'

interface HistoryEntry {
  prompt: string
  userAnswer: string
  correctAnswer: string
  correct: boolean
  pairId?: number
}

function ParadigmHint({ verb, forms, translations, partnerVerb, partnerForms }: {
  verb: Verb
  forms: VerbForm[]
  translations: PairTranslation[]
  partnerVerb?: Verb
  partnerForms?: VerbForm[]
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
          fontSize: '70%', whiteSpace: 'nowrap',
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

  const [verbs, setVerbs] = useState<Verb[]>([])
  const [pairs, setPairs] = useState<AspectPair[]>([])
  const [formsByVerbId, setFormsByVerbId] = useState<Map<number, VerbForm[]>>(new Map())
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [pairTags, setPairTags] = useState<Array<{ pair_id: number; tag_id: number }>>([])
  const [pairTranslations, setPairTranslations] = useState<PairTranslation[]>([])
  const [verbToPairId, setVerbToPairId] = useState<Map<number, number>>(new Map())

  const [question, setQuestion] = useState<Question | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)
  const newDrillRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    Promise.all([
      api.get<Verb[]>('/verbs'),
      api.get<AspectPair[]>('/aspect-pairs'),
      api.get<VerbForm[]>('/verb-forms'),
      api.get<Tag[]>('/tags'),
      api.get<Array<{ pair_id: number; tag_id: number }>>('/pair-tags'),
      api.get<PairTranslation[]>('/pair-translations'),
    ]).then(([vs, ps, fs, tags, pts, trs]) => {
      setVerbs(vs)
      setPairs(ps)
      const map = new Map<number, VerbForm[]>()
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
        v2p.set(p.ipf_verb_id, p.id)
        v2p.set(p.pf_verb_id, p.id)
      }
      setVerbToPairId(v2p)
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

  function nextQuestion() {
    const q = pickQuestion()
    if (!q) return
    setQuestion(q)
    setUserAnswer('')
    if (typeIn) setTimeout(() => inputRef.current?.focus(), 50)
  }

  function startDrill() {
    setHistory([])
    setPhase('asking')
    const q = pickQuestion()
    if (!q) return
    setQuestion(q)
    setUserAnswer('')
    if (typeIn) setTimeout(() => inputRef.current?.focus(), 50)
  }

  function submitAnswer() {
    if (!question) return
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

  function recordFlashcard(correct: boolean) {
    if (!question) return
    const entry: HistoryEntry = {
      prompt: question.prompt,
      userAnswer: '',
      correctAnswer: question.correctForm,
      correct,
      pairId: verbToPairId.get(question.verbId),
    }
    setHistory(prev => [...prev, entry])
    setPhase('asking')
    nextQuestion()
  }

  function endDrill() {
    setPhase('summary')
    setTimeout(() => newDrillRef.current?.focus(), 50)
  }

  function reDrillWrong() {
    const wrongPairIds = new Set(
      history.filter(h => !h.correct && h.pairId != null).map(h => h.pairId!)
    )
    setSelectedPairIds(wrongPairIds)
    setVerbScope('selection')
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
      const aKey = stripAccent(verbsMap.get(a.ipf_verb_id)?.accented ?? '')
      const bKey = stripAccent(verbsMap.get(b.ipf_verb_id)?.accented ?? '')
      return aKey.localeCompare(bKey, 'uk')
    })
    const noneSelected = (verbScope === 'selection' && selectedPairIds.size === 0)
      || (verbScope === 'tag' && selectedTagId === null)
    return (
      <div>
        <h1>Verb Drills</h1>
        <Link to="/">← Back</Link>
        <br /><br />
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
        <br />
        <div>
          <label>
            <input
              type="checkbox"
              checked={useAspect}
              onChange={e => setUseAspect(e.target.checked)}
            />{' '}
            Aspect form drill
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={useInfinitive}
              onChange={e => setUseInfinitive(e.target.checked)}
            />{' '}
            Infinitive → form drill
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={useNumber}
              onChange={e => setUseNumber(e.target.checked)}
            />{' '}
            Singular/plural drill
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={useTranslation}
              onChange={e => setUseTranslation(e.target.checked)}
            />{' '}
            Translation → form drill (de, present/future only)
          </label>
        </div>
        <br />
        <div>
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
        {verbScope === 'tag' && (
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
        {verbScope === 'selection' && (
          <div style={{ marginTop: '0.5rem' }}>
            <button onClick={() => setSelectedPairIds(new Set(pairs.map(p => p.id)))}>Select all</button>
            {' '}
            <button onClick={() => setSelectedPairIds(new Set())}>Select none</button>
            <div style={{ marginTop: '0.5rem', lineHeight: '1.8' }}>
              {sortedPairs.map(p => {
                const ipf = verbsMap.get(p.ipf_verb_id)
                const pf = verbsMap.get(p.pf_verb_id)
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
        <br />
        <button
          className="btn-primary"
          onClick={startDrill}
          disabled={(!useAspect && !useInfinitive && !useNumber && !useTranslation) || noneSelected}
        >
          Start
        </button>
      </div>
    )
  }

  if (phase === 'asking') {
    return (
      <div>
        <h1>Verb Drills</h1>
        <p style={{ color: '#666' }}>Question {history.length + 1}</p>
        {question && (
          <>
            {renderPrompt(question)}
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
        {!typeIn && (
          <>
            <br /><br />
            <button onClick={endDrill}>End drill</button>
          </>
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
    return (
      <div style={{ background: question ? aspectBg[question.aspect] : undefined }}>
        <h1>Verb Drills</h1>
        <p style={{ color: '#666' }}>Question {history.length + 1}</p>
        {question && renderPrompt(question)}
        <p>Answer: <strong>{question?.correctForm}</strong></p>
        {renderTranslations(question ? verbToPairId.get(question.verbId) : undefined)}
        <button
          style={{ background: 'green', color: 'white', padding: '8px 24px', fontSize: '1em' }}
          onClick={() => recordFlashcard(true)}
        >
          Ok
        </button>
        {' '}
        <button
          style={{ background: '#c00', color: 'white', padding: '8px 24px', fontSize: '1em' }}
          onClick={() => recordFlashcard(false)}
        >
          Didn't know
        </button>
        <br /><br />
        <button onClick={endDrill}>End drill</button>
        {question && paradigmHint(question.verbId, question.targetVerbId)}
      </div>
    )
  }

  if (phase === 'reviewing') {
    const last = history[history.length - 1]
    return (
      <div style={{ background: question ? aspectBg[question.aspect] : undefined }}>
        <h1>Verb Drills</h1>
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
        {question && paradigmHint(question.verbId, question.targetVerbId)}
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
      <table>
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
            <tr key={i} style={{ background: h.correct ? '#d4edda' : '#f8d7da' }}>
              <td>{h.prompt}</td>
              {typeIn && <td>{h.userAnswer || '(empty)'}</td>}
              <td>{h.correctAnswer}</td>
              <td><span style={{ color: h.correct ? 'green' : 'red' }}>{h.correct ? '✓' : '✗'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <br />
      <button className="btn-primary" onClick={() => { setPhase('select'); setHistory([]) }} ref={newDrillRef}>
        New drill
      </button>
      {history.some(h => !h.correct && h.pairId != null) && (
        <>
          {' '}
          <button onClick={reDrillWrong}>Re-drill wrong verbs</button>
        </>
      )}
      {' '}
      <Link to="/">Back to verbs</Link>
    </div>
  )
}

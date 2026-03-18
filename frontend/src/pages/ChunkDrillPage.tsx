import { useEffect, useState } from 'react'
import { Nav } from '../components/Nav'
import { api } from '../api/client'
import { Chunk, Tag } from '../types'

type QuestionType = 'A' | 'B'
// A: show original → "translate to [lang]"
// B: show translation → "give the original in [chunk.lang]"

interface Question {
  chunk: Chunk
  type: QuestionType
  prompt: string
  promptLang: string
  answer: string
  answerLang: string
}

interface HistoryEntry {
  prompt: string
  promptLang: string
  correctAnswer: string
  correct: boolean
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function ChunkDrillPage() {
  const [allChunks, setAllChunks] = useState<Chunk[]>([])
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [targetLang, setTargetLang] = useState('de')
  const [availableLangs, setAvailableLangs] = useState<string[]>([])
  const [useTypeA, setUseTypeA] = useState(true)
  const [useTypeB, setUseTypeB] = useState(true)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)

  const [phase, setPhase] = useState<'select' | 'asking' | 'revealing' | 'summary'>('select')
  const [question, setQuestion] = useState<Question | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    Promise.all([
      api.get<Chunk[]>('/chunks'),
      api.get<Tag[]>('/tags'),
    ]).then(([all, tags]) => {
      const drillable = all.filter(c => c.translations.length > 0)
      setAllChunks(drillable)
      setChunks(drillable)
      setAllTags(tags)
      const langs = [...new Set(drillable.flatMap(c => c.translations.map(t => t.lang)))]
      setAvailableLangs(langs)
      if (langs.length > 0 && !langs.includes(targetLang)) setTargetLang(langs[0])
    })
  }, [])

  function getFilteredChunks(): Chunk[] {
    if (selectedTagId === null) return allChunks
    return allChunks.filter(c => c.tags.some(t => t.id === selectedTagId))
  }

  function buildQuestion(filtered?: Chunk[]): Question | null {
    const types: QuestionType[] = [
      ...(useTypeA ? ['A' as const] : []),
      ...(useTypeB ? ['B' as const] : []),
    ]
    if (types.length === 0) return null

    const pool = filtered ?? chunks
    const eligible = pool.filter(c => c.translations.some(t => t.lang === targetLang))
    if (eligible.length === 0) return null

    for (let i = 0; i < 20; i++) {
      const chunk = pickRandom(eligible)
      const translations = chunk.translations.filter(t => t.lang === targetLang)
      if (translations.length === 0) continue
      const trans = pickRandom(translations)
      const type = pickRandom(types)

      if (type === 'A') {
        return { chunk, type, prompt: chunk.text, promptLang: chunk.lang, answer: trans.text, answerLang: targetLang }
      } else {
        return { chunk, type, prompt: trans.text, promptLang: targetLang, answer: chunk.text, answerLang: chunk.lang }
      }
    }
    return null
  }

  function startDrill() {
    setHistory([])
    const filtered = getFilteredChunks()
    setChunks(filtered)
    const q = buildQuestion(filtered)
    if (!q) return
    setQuestion(q)
    setPhase('asking')
  }

  function showAnswer() {
    setPhase('revealing')
  }

  function recordAndNext(correct: boolean) {
    if (!question) return
    setHistory(prev => [...prev, {
      prompt: question.prompt,
      promptLang: question.promptLang,
      correctAnswer: question.answer,
      correct,
    }])
    const q = buildQuestion()
    if (!q) { setPhase('summary'); return }
    setQuestion(q)
    setPhase('asking')
  }

  function endDrill() {
    setPhase('summary')
  }

  const score = history.filter(h => h.correct).length

  if (phase === 'select') {
    return (
      <div>
        <Nav />
        <h1>Chunk drill</h1>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Other language:{' '}
            <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>
              {availableLangs.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            <input type="checkbox" checked={useTypeA} onChange={e => setUseTypeA(e.target.checked)} />{' '}
            Type A: show original → translate to {targetLang}
          </label>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            <input type="checkbox" checked={useTypeB} onChange={e => setUseTypeB(e.target.checked)} />{' '}
            Type B: show {targetLang} → give the original
          </label>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Tag filter:{' '}
            <select value={selectedTagId ?? ''} onChange={e => setSelectedTagId(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">— all chunks —</option>
              {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>
        <button onClick={startDrill} disabled={(!useTypeA && !useTypeB) || allChunks.length === 0}>
          Start
        </button>
        {allChunks.length === 0 && (
          <p style={{ color: '#aaa' }}>No drillable chunks — chunks need at least one translation.</p>
        )}
      </div>
    )
  }

  if (phase === 'asking') {
    return (
      <div>
        <Nav />
        <h1>Chunk drill</h1>
        <p style={{ color: '#666' }}>Question {history.length + 1}</p>
        {question && (
          <>
            <p style={{ fontSize: '0.85em', color: '#888', margin: '0 0 0.1rem' }}>
              {question.type === 'A'
                ? `Translate to ${question.answerLang}`
                : `Give the original in ${question.answerLang}`}
            </p>
            <p style={{ fontSize: '0.8em', color: '#aaa', margin: '0 0 0.25rem' }}>[{question.promptLang}]</p>
            <p style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0 0 1rem' }}>{question.prompt}</p>
            <button className="btn-primary" onClick={showAnswer}>Show answer</button>
          </>
        )}
        <br /><br />
        <button onClick={endDrill}>End drill</button>
      </div>
    )
  }

  if (phase === 'revealing') {
    return (
      <div>
        <Nav />
        <h1>Chunk drill</h1>
        <p style={{ color: '#666' }}>Question {history.length + 1}</p>
        {question && (
          <>
            <p style={{ fontSize: '0.8em', color: '#aaa', margin: '0 0 0.1rem' }}>[{question.promptLang}]</p>
            <p style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0 0 0.5rem' }}>{question.prompt}</p>
            <p style={{ fontSize: '0.8em', color: '#aaa', margin: '0 0 0.1rem' }}>[{question.answerLang}]</p>
            <p style={{ fontSize: '1.1em', margin: '0 0 1rem' }}><strong>{question.answer}</strong></p>
            {question.chunk.notes && (
              <p style={{ color: '#666', fontSize: '0.9em', margin: '0 0 1rem' }}>
                Note: {question.chunk.notes}
              </p>
            )}
          </>
        )}
        <button
          style={{ background: 'green', color: 'white', padding: '8px 24px', fontSize: '1em' }}
          onClick={() => recordAndNext(true)}
        >
          Ok
        </button>
        {' '}
        <button
          style={{ background: '#c00', color: 'white', padding: '8px 24px', fontSize: '1em' }}
          onClick={() => recordAndNext(false)}
        >
          Didn't know
        </button>
        <br /><br />
        <button onClick={endDrill}>End drill</button>
      </div>
    )
  }

  // summary
  return (
    <div>
      <Nav />
      <h1>Chunk drill — results</h1>
      <p>
        Score: <strong>{score} / {history.length}</strong>
        {history.length > 0 && ` (${Math.round((score / history.length) * 100)}%)`}
      </p>
      <br />
      <table>
        <thead>
          <tr>
            <th>Prompt</th>
            <th>Correct answer</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i} style={{ background: h.correct ? '#d4edda' : '#f8d7da' }}>
              <td style={{ fontSize: '0.9em' }}>[{h.promptLang}] {h.prompt}</td>
              <td style={{ fontSize: '0.9em' }}>{h.correctAnswer}</td>
              <td><span style={{ color: h.correct ? 'green' : 'red' }}>{h.correct ? '✓' : '✗'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <br />
      <button className="btn-primary" onClick={() => { setPhase('select'); setHistory([]) }}>
        New drill
      </button>
    </div>
  )
}

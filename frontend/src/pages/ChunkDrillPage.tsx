import { useEffect, useRef, useState } from 'react'
import { Nav } from '../components/Nav'
import { api } from '../api/client'
import { Chunk } from '../types'

type QuestionType = 'A' | 'B'
// A: show original → "translate to [lang]"
// B: show translation → "give the original in [chunk.lang]"

interface Question {
  chunk: Chunk
  type: QuestionType
  prompt: string          // text shown to learner
  promptLang: string
  answer: string
  answerLang: string
}

interface HistoryEntry {
  prompt: string
  promptLang: string
  userAnswer: string
  correctAnswer: string
  correct: boolean
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function normalise(s: string) {
  return s.trim().replace(/\u0301/g, '').toLowerCase().replace(/[.!?,;]/g, '')
}

export default function ChunkDrillPage() {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [targetLang, setTargetLang] = useState('de')
  const [availableLangs, setAvailableLangs] = useState<string[]>([])
  const [useTypeA, setUseTypeA] = useState(true)
  const [useTypeB, setUseTypeB] = useState(true)

  const [phase, setPhase] = useState<'select' | 'asking' | 'revealing' | 'summary'>('select')
  const [question, setQuestion] = useState<Question | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [sessionSize, setSessionSize] = useState(10)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<Chunk[]>('/chunks').then(all => {
      const drillable = all.filter(c => c.translations.length > 0)
      setChunks(drillable)
      // collect all translation langs
      const langs = [...new Set(drillable.flatMap(c => c.translations.map(t => t.lang)))]
      setAvailableLangs(langs)
      if (langs.length > 0 && !langs.includes(targetLang)) setTargetLang(langs[0])
    })
  }, [])

  function buildQuestion(): Question | null {
    const eligible = chunks.filter(c => {
      const hasTrans = c.translations.some(t => t.lang === targetLang)
      if (useTypeA && useTypeB) return hasTrans
      if (useTypeA) return hasTrans
      if (useTypeB) return hasTrans
      return false
    })
    if (eligible.length === 0) return null

    const types: QuestionType[] = [
      ...(useTypeA ? ['A' as const] : []),
      ...(useTypeB ? ['B' as const] : []),
    ]
    if (types.length === 0) return null

    for (let i = 0; i < 20; i++) {
      const chunk = pickRandom(eligible)
      const translations = chunk.translations.filter(t => t.lang === targetLang)
      if (translations.length === 0) continue
      const trans = pickRandom(translations)
      const type = pickRandom(types)

      if (type === 'A') {
        return {
          chunk, type,
          prompt: chunk.text,
          promptLang: chunk.lang,
          answer: trans.text,
          answerLang: targetLang,
        }
      } else {
        return {
          chunk, type,
          prompt: trans.text,
          promptLang: targetLang,
          answer: chunk.text,
          answerLang: chunk.lang,
        }
      }
    }
    return null
  }

  function startDrill() {
    setHistory([])
    const q = buildQuestion()
    if (!q) return
    setQuestion(q)
    setUserAnswer('')
    setPhase('asking')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function submitAnswer() {
    if (!question) return
    const correct = normalise(userAnswer) === normalise(question.answer)
    setHistory(prev => [...prev, {
      prompt: question.prompt,
      promptLang: question.promptLang,
      userAnswer,
      correctAnswer: question.answer,
      correct,
    }])
    setPhase('revealing')
  }

  function nextQuestion() {
    if (history.length >= sessionSize) {
      setPhase('summary')
      return
    }
    const q = buildQuestion()
    if (!q) { setPhase('summary'); return }
    setQuestion(q)
    setUserAnswer('')
    setPhase('asking')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const score = history.filter(h => h.correct).length

  return (
    <div>
      <Nav />
      <h1>Chunk drill</h1>

      {phase === 'select' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Target language:{' '}
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
          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              <input type="checkbox" checked={useTypeB} onChange={e => setUseTypeB(e.target.checked)} />{' '}
              Type B: show {targetLang} → give the original
            </label>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Questions per session:{' '}
              <input
                type="number"
                min={1}
                max={100}
                value={sessionSize}
                onChange={e => setSessionSize(Number(e.target.value))}
                style={{ width: '4rem' }}
              />
            </label>
          </div>
          <button
            onClick={startDrill}
            disabled={!useTypeA && !useTypeB || chunks.length === 0}
          >
            Start
          </button>
          {chunks.length === 0 && <p style={{ color: '#aaa' }}>No drillable chunks (chunks need at least one translation).</p>}
        </div>
      )}

      {(phase === 'asking' || phase === 'revealing') && question && (
        <div>
          <p style={{ color: '#888', fontSize: '0.85em', marginBottom: '0.25rem' }}>
            {history.length + 1} / {sessionSize}
            {'  ·  '}
            {question.type === 'A'
              ? `Translate to ${question.answerLang}`
              : `Give the original in ${question.answerLang}`}
          </p>
          <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '0.1rem' }}>[{question.promptLang}]</p>
          <p style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '1rem' }}>{question.prompt}</p>

          {phase === 'asking' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                ref={inputRef}
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitAnswer() }}
                style={{ width: '30rem' }}
                placeholder={`Answer in ${question.answerLang}…`}
              />
              <button onClick={submitAnswer}>Check</button>
            </div>
          )}

          {phase === 'revealing' && (
            <div>
              <p style={{
                color: history[history.length - 1]?.correct ? 'green' : '#c00',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
              }}>
                {history[history.length - 1]?.correct ? 'Correct!' : 'Incorrect'}
              </p>
              {!history[history.length - 1]?.correct && (
                <p>
                  Your answer: <em>{userAnswer || '(empty)'}</em><br />
                  Correct: <strong>{question.answer}</strong>
                </p>
              )}
              {question.chunk.notes && (
                <p style={{ color: '#666', fontSize: '0.9em' }}>Note: {question.chunk.notes}</p>
              )}
              <button onClick={nextQuestion}>
                {history.length >= sessionSize ? 'See results' : 'Next →'}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'summary' && (
        <div>
          <h2>Results: {score} / {history.length}</h2>
          <table>
            <thead>
              <tr><th>Prompt</th><th>Your answer</th><th>Correct</th><th></th></tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} style={{ background: h.correct ? '#f0fff0' : '#fff0f0' }}>
                  <td style={{ fontSize: '0.85em' }}>[{h.promptLang}] {h.prompt}</td>
                  <td style={{ fontSize: '0.85em' }}>{h.userAnswer || '—'}</td>
                  <td style={{ fontSize: '0.85em' }}>{h.correctAnswer}</td>
                  <td>{h.correct ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <br />
          <button onClick={() => setPhase('select')}>New session</button>
        </div>
      )}
    </div>
  )
}

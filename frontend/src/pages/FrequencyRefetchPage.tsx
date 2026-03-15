import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

interface AspectPair {
  id: number
  ipf_verb_id: number | null
  pf_verb_id: number | null
  ipf_verb?: { accented: string }
  pf_verb?: { accented: string }
}

const DELAY_MS = 2000 // 2 s between pairs — polite Sketch Engine usage

export default function FrequencyRefetchPage() {
  const [corpora, setCorpora] = useState<string[]>([])
  const [pairs, setPairs] = useState<AspectPair[]>([])
  const [corpus, setCorpus] = useState('')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  useEffect(() => {
    Promise.all([
      api.get<string[]>('/corpora'),
      api.get<AspectPair[]>('/aspect-pairs'),
    ]).then(([cs, ps]) => {
      setCorpora(cs)
      if (cs.length > 0) setCorpus(cs[0])
      setPairs(ps)
    })
  }, [])

  async function start() {
    if (!corpus) return
    abortRef.current = false
    setDone(0)
    setError(null)
    setRunning(true)
    setTotal(pairs.length)

    for (let i = 0; i < pairs.length; i++) {
      if (abortRef.current) break
      const pair = pairs[i]
      try {
        await api.post(`/pairs/${pair.id}/fetch-frequency?corpus=${encodeURIComponent(corpus)}`, {})
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(`Pair ${pair.id}: ${msg}`)
        setRunning(false)
        return
      }
      setDone(i + 1)
      if (i < pairs.length - 1) {
        await new Promise(res => setTimeout(res, DELAY_MS))
      }
    }

    setRunning(false)
  }

  function stop() {
    abortRef.current = true
  }

  return (
    <div>
      <h1>Refetch frequencies</h1>
      <Link to="/">← Back</Link>
      <br /><br />

      <div>
        Corpus:{' '}
        <select value={corpus} onChange={e => setCorpus(e.target.value)} disabled={running}>
          {corpora.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <br />

      <p style={{ color: '#666', fontSize: '0.9em' }}>
        Fetches one pair every {DELAY_MS / 1000} s to stay within Sketch Engine rate limits.
      </p>

      {!running && done === 0 && (
        <button onClick={start} disabled={!corpus || pairs.length === 0}>
          Start ({pairs.length} pairs)
        </button>
      )}

      {running && (
        <>
          <p>{done} of {total}</p>
          <button onClick={stop}>Stop</button>
        </>
      )}

      {!running && done > 0 && !error && (
        <>
          <p>{done} of {total} done.</p>
          <button onClick={start}>Run again</button>
        </>
      )}

      {!running && done > 0 && error && (
        <>
          <p>{done} of {total} done before error.</p>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={start}>Retry from beginning</button>
        </>
      )}
    </div>
  )
}

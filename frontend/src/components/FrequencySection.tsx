import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { LexemeFrequency } from '../types'

interface Props {
  lexemeId: number
}

export function FrequencySection({ lexemeId }: Props) {
  const [corpora, setCorpora] = useState<string[]>([])
  const [frequencies, setFrequencies] = useState<LexemeFrequency[]>([])
  const [fetching, setFetching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<string[]>('/corpora'),
      api.get<LexemeFrequency[]>(`/lexemes/${lexemeId}/frequencies`),
    ]).then(([cs, fs]) => {
      setCorpora(cs)
      setFrequencies(fs)
    })
  }, [lexemeId])

  if (corpora.length === 0) return null

  async function fetchFrequency(corpus: string) {
    setFetching(corpus)
    setError(null)
    try {
      const row = await api.post<LexemeFrequency>(
        `/lexemes/${lexemeId}/fetch-frequency?corpus=${encodeURIComponent(corpus)}`,
        {}
      )
      setFrequencies(prev => [...prev.filter(f => f.corpus !== corpus), row])
    } catch (e) {
      setError(String(e))
    } finally {
      setFetching(null)
    }
  }

  return (
    <>
      <h2>Frequency</h2>
      {error && <p style={{ color: '#c00' }}>{error}</p>}
      <table>
        <thead>
          <tr><th>Corpus</th><th>ipm</th><th></th></tr>
        </thead>
        <tbody>
          {corpora.map(corpus => {
            const row = frequencies.find(f => f.corpus === corpus)
            const isFetching = fetching === corpus
            return (
              <tr key={corpus}>
                <td>{corpus}</td>
                <td>{row ? row.ipm.toFixed(2) : '—'}</td>
                <td>
                  <button onClick={() => fetchFrequency(corpus)} disabled={isFetching}>
                    {isFetching ? 'Fetching…' : row ? 'Refresh' : 'Fetch'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

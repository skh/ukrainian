import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { LexemeFrequency } from '../types'

interface Props {
  lexemeId: number
}

export function FrequencySection({ lexemeId }: Props) {
  const [frequencies, setFrequencies] = useState<LexemeFrequency[]>([])

  useEffect(() => {
    api.get<LexemeFrequency[]>(`/lexemes/${lexemeId}/frequencies`).then(setFrequencies)
  }, [lexemeId])

  if (frequencies.length === 0) return null

  return (
    <>
      <h2>Frequency</h2>
      <table>
        <thead>
          <tr><th>Corpus</th><th>Freq</th><th>ipm</th></tr>
        </thead>
        <tbody>
          {frequencies.map(f => (
            <tr key={f.corpus}>
              <td>{f.corpus}</td>
              <td>{f.freq.toLocaleString()}</td>
              <td>{f.ipm.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

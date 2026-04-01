import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Lexeme } from '../types'
import { Nav } from '../components/Nav'
import { genderBg } from '../utils/nouns'
import { aspectBg } from '../utils/theme'

const posBg: Record<string, string> = {
  noun:        '#d1fae5',
  adjective:   '#e9d5ff',
  adverb:      '#fce7f3',
  conjunction: '#fef9c3',
  numeral:     '#ffedd5',
  preposition: '#e0f2fe',
  pronoun:     '#fae8ff',
  pair:        '#ffffff',
}

function entryPath(e: Lexeme) {
  if (e.pos === 'pair') return e.pair_id ? `/pairs/${e.pair_id}` : '#'
  return e.pos === 'noun' ? `/nouns/${e.id}` : `/words/${e.id}`
}

function entryLabel(e: Lexeme) {
  if (e.pos === 'pair' && e.pair) {
    const { ipf_verb, pf_verb } = e.pair
    return (
      <>
        {ipf_verb && <span style={{ background: aspectBg.ipf, padding: '0.1em 0.35em', borderRadius: '3px', marginRight: '0.15em' }}>{ipf_verb.accented}</span>}
        {pf_verb && <span style={{ background: aspectBg.pf, padding: '0.1em 0.35em', borderRadius: '3px' }}>{pf_verb.accented}</span>}
      </>
    )
  }
  return e.accented
}

export default function WordsListPage() {
  const [entries, setEntries] = useState<Lexeme[]>([])

  useEffect(() => {
    api.get<Lexeme[]>('/words').then(setEntries)
  }, [])

  return (
    <div>
      <Nav />
      <h1>Words</h1>
      <Link to="/nouns/add">Add noun</Link>
      {' | '}
      <Link to="/words/add">Add word</Link>
      <br /><br />
      {entries.length === 0 ? (
        <p style={{ color: '#aaa' }}>No entries yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Word</th>
              <th>POS</th>
              <th>Info</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td><Link to={entryPath(e)}>{entryLabel(e)}</Link></td>
                <td>
                  {e.pos !== 'pair' && (
                    <span style={{
                      background: posBg[e.pos] ?? '#eee',
                      padding: '0.1em 0.45em',
                      borderRadius: '3px',
                      fontSize: '0.82em',
                    }}>
                      {e.pos}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: '0.85em', color: '#555' }}>
                  {e.pos === 'noun' && (
                    <>
                      {e.gender && (
                        <span style={{
                          background: genderBg[e.gender],
                          padding: '0.1em 0.35em',
                          borderRadius: '3px',
                          marginRight: '0.4em',
                        }}>
                          {e.gender}
                        </span>
                      )}
                      {e.number_type && e.number_type !== 'both' && (
                        <span style={{ color: '#888' }}>{e.number_type}</span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

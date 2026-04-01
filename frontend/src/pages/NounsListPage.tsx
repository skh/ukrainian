import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Entry, LexemeTranslation } from '../types'
import { Nav } from '../components/Nav'
import { genderBg } from '../utils/nouns'

export default function NounsListPage() {
  const [nouns, setNouns] = useState<Entry[]>([])
  const [deByLexeme, setDeByLexeme] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    Promise.all([
      api.get<Entry[]>('/nouns'),
      api.get<LexemeTranslation[]>('/lexeme-translations'),
    ]).then(([ns, trs]) => {
      setNouns(ns)
      setDeByLexeme(new Map(
        trs.filter(t => t.lang === 'de').map(t => [t.lexeme_id, t.text])
      ))
    })
  }, [])

  return (
    <div>
      <Nav />
      <h1>Nouns</h1>
      <Link to="/nouns/add">Add noun</Link>
      <br /><br />
      {nouns.length === 0 ? (
        <p style={{ color: '#aaa' }}>No nouns yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Noun</th>
              <th>Gender</th>
              <th>Number</th>
              <th>de</th>
            </tr>
          </thead>
          <tbody>
            {nouns.map(n => (
              <tr key={n.id}>
                <td>
                  <Link to={`/nouns/${n.id}`}>{n.accented}</Link>
                </td>
                <td>
                  {n.gender ? (
                    <span style={{
                      background: genderBg[n.gender],
                      padding: '0.1em 0.4em',
                      borderRadius: '3px',
                      fontSize: '0.85em',
                    }}>
                      {n.gender}
                    </span>
                  ) : (
                    <span style={{ color: '#aaa', fontSize: '0.85em' }}>—</span>
                  )}
                </td>
                <td style={{ fontSize: '0.85em', color: '#666' }}>{n.number_type ?? ''}</td>
                <td style={{ fontSize: '0.85em', color: '#555' }}>{deByLexeme.get(n.id) ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

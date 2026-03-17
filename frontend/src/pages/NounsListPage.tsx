import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Entry } from '../types'
import { Nav } from '../components/Nav'

const genderBg: Record<string, string> = { m: '#dbeafe', f: '#fce7f3', n: '#d1fae5' }

export default function NounsListPage() {
  const [nouns, setNouns] = useState<Entry[]>([])

  useEffect(() => {
    api.get<Entry[]>('/nouns').then(setNouns)
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Chunk } from '../types'
import { Nav } from '../components/Nav'

export default function ChunksListPage() {
  const [chunks, setChunks] = useState<Chunk[]>([])

  useEffect(() => {
    api.get<Chunk[]>('/chunks').then(setChunks)
  }, [])

  return (
    <div>
      <Nav />
      <h1>Chunks</h1>
      <Link to="/chunks/add">Add chunk</Link>
      {' | '}
      <Link to="/chunks/drill">Drill chunks</Link>
      <br /><br />
      {chunks.length === 0 ? (
        <p style={{ color: '#aaa' }}>No chunks yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Text</th>
              <th>Lang</th>
              <th>Translations</th>
              <th>Links</th>
            </tr>
          </thead>
          <tbody>
            {chunks.map(c => (
              <tr key={c.id}>
                <td>
                  <Link to={`/chunks/${c.id}`}>{c.text}</Link>
                </td>
                <td style={{ fontSize: '0.85em', color: '#666' }}>{c.lang}</td>
                <td style={{ fontSize: '0.85em', color: '#555' }}>
                  {c.translations.map(t => `${t.lang}: ${t.text}`).join(' · ') || <span style={{ color: '#aaa' }}>—</span>}
                </td>
                <td style={{ fontSize: '0.85em', color: '#555' }}>
                  {c.links.filter(l => l.lexeme_form).map(l => l.lexeme_form).join(', ') || <span style={{ color: '#aaa' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

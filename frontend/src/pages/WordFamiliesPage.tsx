import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { WordFamily, Lexeme } from '../types'
import { aspectBg } from '../utils/theme'

const posBg: Record<string, string> = {
  adjective: '#e9d5ff',
  adverb: '#fce7f3',
  noun: '#d1fae5',
}

function MemberChips({ members }: { members: Lexeme[] }) {
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
      {members.map(m => (
        m.pos === 'pair' && m.pair ? (
          <Link key={m.id} to={`/pairs/${m.pair_id}`} style={{ textDecoration: 'none' }}>
            <span style={{ display: 'inline-flex', gap: '0.15em', fontSize: '0.9em' }}>
              {m.pair.ipf_verb && (
                <span style={{ background: aspectBg.ipf, padding: '0.1em 0.35em', borderRadius: '3px', color: 'inherit' }}>
                  {m.pair.ipf_verb.accented}
                </span>
              )}
              {m.pair.pf_verb && (
                <span style={{ background: aspectBg.pf, padding: '0.1em 0.35em', borderRadius: '3px', color: 'inherit' }}>
                  {m.pair.pf_verb.accented}
                </span>
              )}
            </span>
          </Link>
        ) : (
          <span key={m.id} style={{ background: posBg[m.pos] ?? '#eee', padding: '0.1em 0.35em', borderRadius: '3px', fontSize: '0.9em' }}>
            {m.form}
            <span style={{ color: '#888', fontSize: '0.75em', marginLeft: '0.3em' }}>{m.pos}</span>
          </span>
        )
      ))}
    </span>
  )
}

export default function WordFamiliesPage() {
  const navigate = useNavigate()
  const [families, setFamilies] = useState<WordFamily[]>([])

  useEffect(() => {
    api.get<WordFamily[]>('/word-families').then(setFamilies)
  }, [])

  async function createFamily() {
    const f = await api.post<WordFamily>('/word-families', {})
    navigate(`/word-families/${f.id}`)
  }

  return (
    <div>
      <Link to="/">← Back</Link>
      <h1>Word Families</h1>
      <button className="btn-primary" onClick={createFamily}>New family</button>
      {families.length > 0 && (
        <table style={{ marginTop: '1rem', width: '100%' }}>
          <tbody>
            {families.map(f => (
              <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/word-families/${f.id}`)}>
                <td style={{ padding: '0.4rem 0' }}>
                  <MemberChips members={f.members} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {families.length === 0 && <p style={{ color: '#888', marginTop: '1rem' }}>No word families yet.</p>}
    </div>
  )
}

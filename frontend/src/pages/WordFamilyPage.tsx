import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { api } from '../api/client'
import { WordFamily, Lexeme, Verb, AspectPair } from '../types'
import { aspectBg } from '../utils/theme'
import { stripAccent } from '../utils/forms'
import { gorohLexemeUrl } from '../config'

type Pos = 'noun' | 'adjective' | 'adverb'

const posBg: Record<string, string> = {
  adjective: '#e9d5ff',
  adverb: '#fce7f3',
  noun: '#d1fae5',
}

function MemberChip({ lexeme, onRemove }: { lexeme: Lexeme; onRemove: () => void }) {
  const removeBtn = (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
      style={{ fontSize: '0.7em', padding: '0 0.25em', marginLeft: '0.25em', color: '#c00', lineHeight: 1 }}
    >×</button>
  )

  if (lexeme.pos === 'pair' && lexeme.pair) {
    const { pair } = lexeme
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
        <Link to={`/pairs/${lexeme.pair_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', gap: '0.15em' }}>
          {pair.ipf_verb && (
            <span style={{ background: aspectBg.ipf, padding: '0.15em 0.4em', borderRadius: '4px' }}>
              {pair.ipf_verb.accented}
            </span>
          )}
          {pair.pf_verb && (
            <span style={{ background: aspectBg.pf, padding: '0.15em 0.4em', borderRadius: '4px' }}>
              {pair.pf_verb.accented}
            </span>
          )}
        </Link>
        {removeBtn}
      </span>
    )
  }

  const gorohHref = gorohLexemeUrl(lexeme.form, lexeme.pos as Pos)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: posBg[lexeme.pos] ?? '#eee', padding: '0.15em 0.4em', borderRadius: '4px' }}>
      {gorohHref
        ? <a href={gorohHref} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{lexeme.form}</a>
        : <span>{lexeme.form}</span>
      }
      <span style={{ color: '#888', fontSize: '0.75em', marginLeft: '0.3em' }}>{lexeme.pos}</span>
      {removeBtn}
    </span>
  )
}

export default function WordFamilyPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const navigate = useNavigate()

  const [family, setFamily] = useState<WordFamily | null>(null)
  const [allVerbs, setAllVerbs] = useState<Verb[]>([])
  const [allPairs, setAllPairs] = useState<AspectPair[]>([])
  const [addPairInput, setAddPairInput] = useState('')
  const [newLexemeForm, setNewLexemeForm] = useState('')
  const [newLexemePos, setNewLexemePos] = useState<Pos>('noun')
  const [message, setMessage] = useState('')

  async function load() {
    const [f, vs, ps] = await Promise.all([
      api.get<WordFamily>(`/word-families/${familyId}`),
      api.get<Verb[]>('/verbs'),
      api.get<AspectPair[]>('/aspect-pairs'),
    ])
    setFamily(f)
    setAllVerbs(vs)
    setAllPairs(ps)
  }

  useEffect(() => { load() }, [familyId])

  async function removeMember(lexemeId: number) {
    const f = await api.delete<WordFamily>(`/word-families/${familyId}/members/${lexemeId}`)
    setFamily(f)
  }

  async function addPair() {
    const q = stripAccent(addPairInput.toLowerCase())
    // Find matching pair by searching verbs
    const matchedVerb = allVerbs.find(v =>
      stripAccent(v.accented.toLowerCase()) === q || stripAccent(v.infinitive.toLowerCase()) === q
    )
    if (!matchedVerb) { setMessage('Verb not found — select from the list.'); return }
    const pair = allPairs.find(p => p.ipf_verb_id === matchedVerb.id || p.pf_verb_id === matchedVerb.id)
    if (!pair) { setMessage('This verb is not part of a pair.'); return }
    // Get the lexeme id for this pair from current family members or fetch lexemes
    const allLexemes = await api.get<Lexeme[]>('/lexemes')
    const lexeme = allLexemes.find(l => l.pair_id === pair.id)
    if (!lexeme) { setMessage('Lexeme for this pair not found.'); return }
    try {
      const f = await api.post<WordFamily>(`/word-families/${familyId}/members/${lexeme.id}`, {})
      setFamily(f)
      setAddPairInput('')
      setMessage('')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error')
    }
  }

  async function addLexeme() {
    if (!newLexemeForm.trim()) return
    try {
      await api.post<Lexeme>(`/word-families/${familyId}/lexemes`, { form: newLexemeForm.trim(), pos: newLexemePos })
      await load()
      setNewLexemeForm('')
      setMessage('')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error')
    }
  }

  async function deleteFamily() {
    if (!confirm('Delete this word family? The words themselves will not be deleted.')) return
    await api.delete(`/word-families/${familyId}`)
    navigate('/word-families')
  }

  if (!family) return <p>Loading…</p>

  // Build datalist options: all verb accented forms + unaccented, for pair search
  const pairVerbs = allVerbs.filter(v =>
    allPairs.some(p => p.ipf_verb_id === v.id || p.pf_verb_id === v.id)
  )

  return (
    <div>
      <Nav />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', margin: '1.5rem 0 1rem' }}>
        {family.members.length === 0
          ? <span style={{ color: '#aaa' }}>No members yet.</span>
          : family.members.map(m => (
              <MemberChip key={m.id} lexeme={m} onRemove={() => removeMember(m.id)} />
            ))
        }
      </div>

      <h2>Add verb pair</h2>
      <input
        list="pair-verb-list"
        value={addPairInput}
        onChange={e => setAddPairInput(e.target.value)}
        placeholder="Type a verb…"
        style={{ width: '18rem', maxWidth: '100%' }}
      />
      <datalist id="pair-verb-list">
        {pairVerbs.flatMap(v => [
          <option key={v.id} value={v.accented} />,
          <option key={`${v.id}-plain`} value={stripAccent(v.accented)} />,
        ])}
      </datalist>
      {' '}<button onClick={addPair} disabled={!addPairInput.trim()}>Add</button>

      <h2>Add word</h2>
      <input
        value={newLexemeForm}
        onChange={e => setNewLexemeForm(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') addLexeme() }}
        placeholder="Base form (unaccented)…"
        style={{ width: '18rem', maxWidth: '100%' }}
      />
      {' '}
      {(['noun', 'adjective', 'adverb'] as Pos[]).map(pos => (
        <label key={pos} style={{ marginRight: '0.6rem' }}>
          <input
            type="radio"
            name="pos"
            value={pos}
            checked={newLexemePos === pos}
            onChange={() => setNewLexemePos(pos)}
          />{' '}{pos}
        </label>
      ))}
      {' '}<button onClick={addLexeme} disabled={!newLexemeForm.trim()}>Add</button>

      {message && <p style={{ color: '#c00' }}>{message}</p>}

      <div style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <button style={{ color: '#c00' }} onClick={deleteFamily}>Delete family</button>
      </div>
    </div>
  )
}

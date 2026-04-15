import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { GorohCandidate, GorohForm, Entry, Verb } from '../types'
import { Nav } from '../components/Nav'
import { aspectBg } from '../utils/theme'

const POS_LABELS: Record<string, string> = {
  noun: 'іменник',
  adjective: 'прикметник',
  pronoun: 'займенник',
  numeral: 'числівник',
  verb: 'дієслово',
  adverb: 'прислівник',
  preposition: 'прийменник',
  conjunction: 'сполучник',
}

const POS_BG: Record<string, string> = {
  noun:        '#d1fae5',
  adjective:   '#e9d5ff',
  pronoun:     '#fae8ff',
  numeral:     '#ffedd5',
  verb:        '#e0f2fe',
  adverb:      '#fce7f3',
  preposition: '#e0f2fe',
  conjunction: '#fef9c3',
}

function entryPath(pos: string, id: number): string {
  if (pos === 'verb')      return `/verbs/${id}/edit`
  if (pos === 'noun')      return `/nouns/${id}`
  if (pos === 'adjective') return `/adjectives/${id}`
  if (pos === 'pronoun')   return `/pronouns/${id}`
  if (pos === 'numeral')   return `/numerals/${id}`
  return `/words/${id}`
}

function tagsToVerbForm(tags: string, form: string) {
  const parts = new Set(tags.split(','))
  return {
    tense:  ['present', 'future', 'past', 'imperative'].find(t => parts.has(t)) ?? '',
    person: ['1', '2', '3'].find(p => parts.has(p)) ?? null,
    number: ['singular', 'plural'].find(n => parts.has(n)) ?? null,
    gender: ['masculine', 'feminine', 'neuter'].find(g => parts.has(g)) ?? null,
    form,
  }
}

interface InlineFormProps {
  candidate: GorohCandidate
  onSaved: (id: number, pos: string) => void
  onCancel: () => void
}

function InlineForm({ candidate, onSaved, onCancel }: InlineFormProps) {
  const [accented, setAccented] = useState(candidate.accented)
  const [gender, setGender] = useState<'m' | 'f' | 'n' | ''>(candidate.gender ?? '')
  const [numberType, setNumberType] = useState<'sg' | 'pl' | 'both'>(candidate.number_type ?? 'both')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const lemma = accented.replace(/\u0301/g, '')

      if (candidate.pos === 'verb') {
        const verb = await api.post<Verb>('/verbs', {
          infinitive: lemma,
          accented,
          aspect: candidate.aspect,
        })
        if (candidate.forms.length > 0) {
          await api.put(`/verbs/${verb.id}/forms`, candidate.forms.map(f => tagsToVerbForm(f.tags, f.form)))
        }
        onSaved(verb.id, 'verb')

      } else if (candidate.pos === 'noun') {
        const noun = await api.post<Entry>('/nouns', {
          lemma, accented, gender: gender || null, number_type: numberType,
        })
        if (candidate.forms.length > 0) {
          await api.put(`/nouns/${noun.id}/forms`, candidate.forms)
        }
        onSaved(noun.id, 'noun')

      } else if (['adjective', 'pronoun', 'numeral'].includes(candidate.pos)) {
        const plural = `${candidate.pos}s`
        const entry = await api.post<Entry>(`/${plural}`, { accented })
        if (candidate.forms.length > 0) {
          await api.put(`/${plural}/${entry.id}/forms`, candidate.forms)
        }
        onSaved(entry.id, candidate.pos)

      } else {
        // indeclinables: adverb, preposition, conjunction
        const entry = await api.post<Entry>('/words', { accented, pos: candidate.pos })
        onSaved(entry.id, candidate.pos)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label>
          Accented:{' '}
          <input value={accented} onChange={e => setAccented(e.target.value)} style={{ width: '14rem' }} />
        </label>
        {candidate.pos === 'verb' && candidate.aspect && (
          <span className="badge" style={{ background: aspectBg[candidate.aspect as 'ipf' | 'pf'] }}>
            {candidate.aspect}
          </span>
        )}
      </div>

      {candidate.pos === 'noun' && (
        <div style={{ marginBottom: '0.6rem', display: 'flex', gap: '1rem' }}>
          <label>
            Gender:{' '}
            <select value={gender} onChange={e => setGender(e.target.value as 'm' | 'f' | 'n' | '')}>
              <option value="">—</option>
              <option value="m">m</option>
              <option value="f">f</option>
              <option value="n">n</option>
            </select>
          </label>
          <label>
            Number:{' '}
            <select value={numberType} onChange={e => setNumberType(e.target.value as 'sg' | 'pl' | 'both')}>
              <option value="both">both</option>
              <option value="sg">sg only</option>
              <option value="pl">pl only</option>
            </select>
          </label>
        </div>
      )}

      {candidate.forms.length > 0 && (
        <p className="text-muted" style={{ fontSize: '0.8em', margin: '0 0 0.6rem' }}>
          {candidate.forms.length} forms will be imported
        </p>
      )}

      {error && <p className="text-danger" style={{ margin: '0 0 0.5rem' }}>{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Add'}
      </button>
      {' '}
      <button type="button" onClick={onCancel} style={{ background: 'transparent', color: '#444', border: '1px solid #ccc' }}>
        Cancel
      </button>
    </form>
  )
}

interface CandidateCardProps {
  candidate: GorohCandidate
  selected: boolean
  onSelect: () => void
  onSaved: (id: number, pos: string) => void
  onCancel: () => void
}

function CandidateCard({ candidate, selected, onSelect, onSaved, onCancel }: CandidateCardProps) {
  const dim = candidate.already_exists

  return (
    <div style={{
      border: `1px solid ${selected ? '#111' : '#e5e7eb'}`,
      borderRadius: '6px',
      padding: '0.6rem 0.85rem',
      marginBottom: '0.5rem',
      opacity: dim ? 0.5 : 1,
      background: selected ? '#fafafa' : 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.1em', fontWeight: 600 }}>{candidate.accented}</span>
        {candidate.gloss && (
          <span className="text-muted" style={{ fontSize: '0.85em' }}>— {candidate.gloss}</span>
        )}
        <span className="badge" style={{ background: POS_BG[candidate.pos] ?? '#eee' }}>
          {POS_LABELS[candidate.pos] ?? candidate.pos}
        </span>
        {candidate.pos === 'verb' && candidate.aspect && (
          <span className="badge" style={{ background: aspectBg[candidate.aspect as 'ipf' | 'pf'] }}>
            {candidate.aspect}
          </span>
        )}
        {candidate.pos === 'noun' && candidate.gender && (
          <span className="text-muted" style={{ fontSize: '0.85em' }}>{candidate.gender}</span>
        )}
        {dim && (
          <span className="text-faint" style={{ fontSize: '0.8em', marginLeft: 'auto' }}>
            already in dictionary
            {candidate.existing_id && (
              <>{' '}(<Link to={entryPath(candidate.pos, candidate.existing_id)}>view</Link>)</>
            )}
          </span>
        )}
        {!dim && !selected && (
          <button
            onClick={onSelect}
            style={{ marginLeft: 'auto', background: 'transparent', color: '#005BBB', border: '1px solid #005BBB' }}
          >
            Add this
          </button>
        )}
      </div>

      {selected && !dim && (
        <InlineForm candidate={candidate} onSaved={onSaved} onCancel={onCancel} />
      )}
    </div>
  )
}

export default function QuickAddPage() {
  const [word, setWord] = useState('')
  const [candidates, setCandidates] = useState<GorohCandidate[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [savedEntries, setSavedEntries] = useState<Array<{ id: number; pos: string; accented: string }>>([])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!word.trim()) return
    setLoading(true)
    setFetchError('')
    setCandidates(null)
    setSelectedId(null)
    setSavedEntries([])
    try {
      const results = await api.get<GorohCandidate[]>(`/goroh-fetch?word=${encodeURIComponent(word.trim())}`)
      setCandidates(results)
    } catch (err) {
      setFetchError(String(err))
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(id: number, pos: string) {
    const accented = candidates?.find(c => c.goroh_id === selectedId)?.accented ?? ''
    setSavedEntries(prev => [...prev, { id, pos, accented }])
    // Mark that candidate as now existing
    setCandidates(prev => prev?.map(c =>
      c.goroh_id === selectedId ? { ...c, already_exists: true, existing_id: id } : c
    ) ?? null)
    setSelectedId(null)
  }

  const allExist = candidates !== null && candidates.length > 0 && candidates.every(c => c.already_exists)
  const noResults = candidates !== null && candidates.length === 0

  return (
    <div>
      <Nav />
      <h1>Quick add</h1>

      <form onSubmit={search} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          value={word}
          onChange={e => setWord(e.target.value)}
          placeholder="Type any form of a Ukrainian word…"
          style={{ width: '20rem', maxWidth: '100%' }}
          autoFocus
        />
        <button type="submit" disabled={loading || !word.trim()}>
          {loading ? 'Fetching…' : 'Look up'}
        </button>
      </form>

      {savedEntries.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {savedEntries.map(e => (
            <p key={e.id} style={{ margin: '0.2rem 0' }}>
              <span style={{ color: 'green' }}>✓</span>{' '}
              <Link to={entryPath(e.pos, e.id)}>{e.accented}</Link> added
            </p>
          ))}
        </div>
      )}

      {fetchError && <p className="text-danger">{fetchError}</p>}

      {(noResults || allExist) && !fetchError && (
        <p className="text-muted">Nothing to add — all candidates are already in your dictionary.</p>
      )}

      {candidates && candidates.map(c => (
        <CandidateCard
          key={c.goroh_id}
          candidate={c}
          selected={selectedId === c.goroh_id}
          onSelect={() => setSelectedId(c.goroh_id)}
          onSaved={handleSaved}
          onCancel={() => setSelectedId(null)}
        />
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { Entry } from '../types'
import { parseNoun } from '../utils/nounParser'
import { Nav } from '../components/Nav'
import { TranslationRow } from '../components/TranslationRow'
import { useTranslations } from '../hooks/useTranslations'
import { CASE_LABELS, CASES, genderBg } from '../utils/nouns'

export default function NounPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [noun, setNoun] = useState<Entry | null>(null)
  const [gender, setGender] = useState<'m' | 'f' | 'n' | ''>('')
  const [numberType, setNumberType] = useState<'sg' | 'pl' | 'both'>('both')
  const [metaSaved, setMetaSaved] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { langs, translations, addTranslation, updateTranslation, deleteTranslation } = useTranslations(id)

  useEffect(() => {
    if (id) {
      api.get<Entry>(`/nouns/${id}`).then(n => {
        setNoun(n)
        setGender((n.gender ?? '') as 'm' | 'f' | 'n' | '')
        setNumberType(n.number_type ?? 'both')
      })
    }
  }, [id])

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault()
    if (!noun) return
    const updated = await api.patch<Entry>(`/nouns/${noun.id}`, {
      gender: gender || null,
      number_type: numberType,
    })
    setNoun(updated)
    setMetaSaved(true)
    setTimeout(() => setMetaSaved(false), 1500)
  }

  async function replaceForms() {
    if (!noun) return
    setParseError('')
    const parsed = parseNoun(pasteText)
    if (!parsed) { setParseError('Could not parse goroh text.'); return }
    const updated = await api.put<Entry>(`/nouns/${noun.id}/forms`, parsed.forms)
    // always sync accented/lemma/gender/number_type from the paste
    const withMeta = await api.patch<Entry>(`/nouns/${noun.id}`, {
      lemma: parsed.accented.replace(/\u0301/g, ''),
      accented: parsed.accented,
      gender: parsed.gender,
      number_type: parsed.number_type,
    })
    setNoun(withMeta)
    setGender((withMeta.gender ?? '') as 'm' | 'f' | 'n' | '')
    setNumberType(withMeta.number_type ?? 'both')
    setPasteText('')
  }

  async function handleDelete() {
    if (!noun) return
    try {
      await api.delete(`/nouns/${noun.id}`)
      navigate('/nouns')
    } catch (err: unknown) {
      setDeleteError(String(err))
      setConfirming(false)
    }
  }

  if (!noun) return <div><Nav /><p>Loading...</p></div>

  const hasSg = noun.number_type === 'sg' || noun.number_type === 'both'
  const hasPl = noun.number_type === 'pl' || noun.number_type === 'both'

  return (
    <div>
      <Nav />
      <h1>
        {noun.accented}
        {noun.gender && (
          <span className="badge" style={{ marginLeft: '0.5rem', background: genderBg[noun.gender], fontSize: '0.7em', verticalAlign: 'middle' }}>
            {noun.gender}
          </span>
        )}
        {noun.number_type && (
          <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.6em', verticalAlign: 'middle' }}>
            {noun.number_type}
          </span>
        )}
      </h1>

      {langs.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {langs.map(lang => (
            <TranslationRow
              key={lang}
              lang={lang}
              items={translations.filter(t => t.lang === lang)}
              searchWord={noun.lemma}
              onAdd={text => addTranslation(lang, text)}
              onUpdate={(tid, text) => updateTranslation(tid, text)}
              onDelete={tid => deleteTranslation(tid)}
            />
          ))}
        </div>
      )}

      <form onSubmit={saveMeta} style={{ marginBottom: '1.5rem' }}>
        <label>
          Gender:{' '}
          <select value={gender} onChange={e => setGender(e.target.value as 'm' | 'f' | 'n' | '')}>
            <option value="">— (none)</option>
            <option value="m">m</option>
            <option value="f">f</option>
            <option value="n">n</option>
          </select>
        </label>
        {'  '}
        <label>
          Number:{' '}
          <select value={numberType} onChange={e => setNumberType(e.target.value as 'sg' | 'pl' | 'both')}>
            <option value="both">both</option>
            <option value="sg">sg</option>
            <option value="pl">pl</option>
          </select>
        </label>
        {'  '}
        <button type="submit">Save</button>
        {metaSaved && <span style={{ marginLeft: '0.5em', color: 'green' }}>Saved</span>}
      </form>

      {noun.forms && noun.forms.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Case</th>
              {hasSg && <th>Singular</th>}
              {hasPl && <th>Plural</th>}
            </tr>
          </thead>
          <tbody>
            {CASES.map(c => {
              const sg = noun.forms!.filter(f => f.tags === `${c},sg`).map(f => f.form).join(', ') || undefined
              const pl = noun.forms!.filter(f => f.tags === `${c},pl`).map(f => f.form).join(', ') || undefined
              return (
                <tr key={c}>
                  <td>{CASE_LABELS[c]}</td>
                  {hasSg && <td>{sg ?? '—'}</td>}
                  {hasPl && <td>{pl ?? '—'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-faint">No forms stored.</p>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>
          {noun.forms && noun.forms.length > 0 ? 'Replace forms' : 'Add forms'} (goroh paste)
        </h3>
        <textarea
          rows={10}
          cols={50}
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder="Paste noun paradigm from goroh.pp.ua..."
          style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
        />
        <br />
        <button onClick={replaceForms} disabled={!pasteText.trim()}>
          {noun.forms && noun.forms.length > 0 ? 'Replace forms' : 'Add forms'}
        </button>
        {parseError && <span className="text-danger" style={{ marginLeft: '0.5em' }}>{parseError}</span>}
      </div>

      <div style={{ marginTop: '2rem' }}>
        {deleteError && <p className="text-danger">{deleteError}</p>}
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-danger">Delete</button>
        ) : (
          <>
            <span>Delete {noun.accented}? </span>
            <button onClick={handleDelete} className="text-danger">Yes, delete</button>
            {' '}
            <button onClick={() => setConfirming(false)}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

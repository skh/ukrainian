import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { Entry, LexemeTranslation } from '../types'
import { parseNoun } from '../utils/nounParser'
import { Nav } from '../components/Nav'
import { TranslationRow } from '../components/TranslationRow'
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
  const [langs, setLangs] = useState<string[]>([])
  const [translations, setTranslations] = useState<LexemeTranslation[]>([])

  useEffect(() => {
    if (id) {
      api.get<Entry>(`/nouns/${id}`).then(n => {
        setNoun(n)
        setGender((n.gender ?? '') as 'm' | 'f' | 'n' | '')
        setNumberType(n.number_type ?? 'both')
      })
      Promise.all([
        api.get<string[]>('/languages'),
        api.get<LexemeTranslation[]>(`/lexemes/${id}/translations`),
      ]).then(([ls, trs]) => {
        setLangs(ls)
        setTranslations(trs)
      })
    }
  }, [id])

  async function addTranslation(lang: string, text: string) {
    const t = await api.post<LexemeTranslation>(`/lexemes/${id}/translations`, { lang, text })
    setTranslations(prev => [...prev, t])
  }

  async function updateTranslation(tid: number, text: string) {
    const t = await api.put<LexemeTranslation>(`/lexeme-translations/${tid}`, { text })
    setTranslations(prev => prev.map(x => x.id === tid ? t : x))
  }

  async function deleteTranslation(tid: number) {
    await api.delete(`/lexeme-translations/${tid}`)
    setTranslations(prev => prev.filter(x => x.id !== tid))
  }

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
          <span style={{
            marginLeft: '0.5rem',
            background: genderBg[noun.gender],
            padding: '0.1em 0.4em',
            borderRadius: '3px',
            fontSize: '0.7em',
            verticalAlign: 'middle',
          }}>
            {noun.gender}
          </span>
        )}
        {noun.number_type && (
          <span style={{ marginLeft: '0.5rem', color: '#888', fontSize: '0.6em', verticalAlign: 'middle' }}>
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
              const sg = noun.forms!.find(f => f.tags === `${c},sg`)?.form
              const pl = noun.forms!.find(f => f.tags === `${c},pl`)?.form
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
        <p style={{ color: '#aaa' }}>No forms stored.</p>
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
        {parseError && <span style={{ color: 'red', marginLeft: '0.5em' }}>{parseError}</span>}
      </div>

      <div style={{ marginTop: '2rem' }}>
        {deleteError && <p style={{ color: 'red' }}>{deleteError}</p>}
        {!confirming ? (
          <button onClick={() => setConfirming(true)} style={{ color: 'red' }}>Delete</button>
        ) : (
          <>
            <span>Delete {noun.accented}? </span>
            <button onClick={handleDelete} style={{ color: 'red' }}>Yes, delete</button>
            {' '}
            <button onClick={() => setConfirming(false)}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Entry } from '../types'
import { parseDeclinable } from '../utils/adjectiveParser'
import { Nav } from '../components/Nav'
import { TranslationRow } from '../components/TranslationRow'
import { useTranslations } from '../hooks/useTranslations'
import { CASE_LABELS, CASES } from '../utils/nouns'
import { FrequencySection } from '../components/FrequencySection'
import { LexemeTagEditor } from '../widgets/LexemeTagEditor'

type DeclinablePos = 'adjective' | 'pronoun' | 'numeral'

const POS_LABEL: Record<DeclinablePos, string> = {
  adjective: 'adjective',
  pronoun: 'pronoun',
  numeral: 'numeral',
}

interface Props {
  pos: DeclinablePos
}

export default function DeclinablePage({ pos }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const plural = `${pos}s`

  const [item, setItem] = useState<Entry | null>(null)
  const [editAccented, setEditAccented] = useState('')
  const [accentedSaved, setAccentedSaved] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { langs, translations, addTranslation, updateTranslation, deleteTranslation } = useTranslations(id)

  useEffect(() => {
    if (!id) return
    api.get<Entry>(`/${plural}/${id}`).then(n => {
      setItem(n)
      setEditAccented(n.accented)
    })
  }, [id, plural])

  async function saveAccented(e: React.FormEvent) {
    e.preventDefault()
    if (!item) return
    const updated = await api.patch<Entry>(`/${plural}/${item.id}`, { accented: editAccented })
    setItem(prev => prev ? { ...prev, accented: updated.accented } : prev)
    setAccentedSaved(true)
    setTimeout(() => setAccentedSaved(false), 1500)
  }

  async function replaceForms() {
    if (!item) return
    setParseError('')
    const parsed = parseDeclinable(pasteText)
    if (!parsed) { setParseError('Could not parse goroh text.'); return }
    if (parsed.pos !== pos) { setParseError(`Expected ${pos}, got ${parsed.pos}.`); return }
    const updated = await api.put<Entry>(`/${plural}/${item.id}/forms`, parsed.forms)
    const withMeta = await api.patch<Entry>(`/${plural}/${item.id}`, { accented: parsed.accented })
    setItem({ ...withMeta, forms: updated.forms })
    setEditAccented(parsed.accented)
    setPasteText('')
  }

  async function handleDelete() {
    if (!item) return
    try {
      await api.delete(`/${plural}/${item.id}`)
      navigate(`/${plural}`)
    } catch (err) {
      setDeleteError(String(err))
      setConfirming(false)
    }
  }

  if (!item) return <div><Nav /><p>Loading…</p></div>

  // Determine form table layout: 4-col if any tag has 3 parts (nom,sg,m)
  const hasFourCols = item.forms?.some(f => f.tags.split(',').length === 3) ?? false
  const hasSg = !hasFourCols && item.forms?.some(f => f.tags.endsWith(',sg'))
  const hasPl = !hasFourCols && item.forms?.some(f => f.tags.endsWith(',pl'))

  return (
    <div>
      <Nav />
      <h1>
        {item.accented}
        <span className="badge text-dim" style={{ marginLeft: '0.5rem', background: '#e5e7eb', fontSize: '0.65em', verticalAlign: 'middle' }}>
          {POS_LABEL[pos]}
        </span>
      </h1>
      {id && <LexemeTagEditor lexemeId={Number(id)} />}

      {langs.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {langs.map(lang => (
            <TranslationRow
              key={lang}
              lang={lang}
              items={translations.filter(t => t.lang === lang)}
              searchWord={item?.lemma}
              onAdd={text => addTranslation(lang, text)}
              onUpdate={(tid, text) => updateTranslation(tid, text)}
              onDelete={tid => deleteTranslation(tid)}
            />
          ))}
        </div>
      )}

      <form onSubmit={saveAccented} style={{ marginBottom: '1.5rem' }}>
        <label>
          Accented:{' '}
          <input value={editAccented} onChange={e => setEditAccented(e.target.value)} />
        </label>
        {'  '}
        <button type="submit">Save</button>
        {accentedSaved && <span style={{ marginLeft: '0.5em', color: 'green' }}>Saved</span>}
      </form>

      {item.forms && item.forms.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Case</th>
              {hasFourCols ? (
                <><th>m sg</th><th>f sg</th><th>n sg</th><th>pl</th></>
              ) : (
                <>{hasSg && <th>Singular</th>}{hasPl && <th>Plural</th>}</>
              )}
            </tr>
          </thead>
          <tbody>
            {CASES.map(c => {
              if (hasFourCols) {
                const m  = item.forms!.filter(f => f.tags === `${c},sg,m`).map(f => f.form).join(', ')
                const f_ = item.forms!.filter(f => f.tags === `${c},sg,f`).map(f => f.form).join(', ')
                const n  = item.forms!.filter(f => f.tags === `${c},sg,n`).map(f => f.form).join(', ')
                const pl = item.forms!.filter(f => f.tags === `${c},pl`).map(f => f.form).join(', ')
                if (!m && !f_ && !n && !pl) return null
                return (
                  <tr key={c}>
                    <td>{CASE_LABELS[c]}</td>
                    <td>{m || '—'}</td>
                    <td>{f_ || '—'}</td>
                    <td>{n || '—'}</td>
                    <td>{pl || '—'}</td>
                  </tr>
                )
              }
              const sg = item.forms!.filter(f => f.tags === `${c},sg`).map(f => f.form).join(', ') || undefined
              const pl = item.forms!.filter(f => f.tags === `${c},pl`).map(f => f.form).join(', ') || undefined
              if (!sg && !pl) return null
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
          {item.forms && item.forms.length > 0 ? 'Replace forms' : 'Add forms'} (goroh paste)
        </h3>
        <textarea
          rows={10}
          cols={50}
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder={`Paste ${pos} paradigm from goroh.pp.ua…`}
          style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
        />
        <br />
        <button onClick={replaceForms} disabled={!pasteText.trim()}>
          {item.forms && item.forms.length > 0 ? 'Replace forms' : 'Add forms'}
        </button>
        {parseError && <span className="text-danger" style={{ marginLeft: '0.5em' }}>{parseError}</span>}
      </div>

      {id && <FrequencySection lexemeId={Number(id)} />}

      <div style={{ marginTop: '2rem' }}>
        {deleteError && <p className="text-danger">{deleteError}</p>}
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-danger">Delete</button>
        ) : (
          <>
            <span>Delete {item.accented}? </span>
            <button onClick={handleDelete} className="text-danger">Yes, delete</button>
            {' '}
            <button onClick={() => setConfirming(false)}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

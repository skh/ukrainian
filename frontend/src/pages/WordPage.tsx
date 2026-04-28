import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Entry } from '../types'
import { Nav } from '../components/Nav'
import { TranslationRow } from '../components/TranslationRow'
import { useTranslations } from '../hooks/useTranslations'
import { FrequencySection } from '../components/FrequencySection'
import { LexemeTagEditor } from '../widgets/LexemeTagEditor'

export default function WordPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [word, setWord] = useState<Entry | null>(null)
  const [accented, setAccented] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { langs, translations, addTranslation, updateTranslation, deleteTranslation } = useTranslations(id)

  useEffect(() => {
    if (id) {
      api.get<Entry>(`/words/${id}`).then(w => {
        setWord(w)
        setAccented(w.accented)
      })
    }
  }, [id])

  async function saveAccented(e: React.FormEvent) {
    e.preventDefault()
    if (!word) return
    const acc = accented.trim()
    if (!acc) return
    const updated = await api.patch<Entry>(`/nouns/${word.id}`, {
      accented: acc,
      lemma: acc.replace(/\u0301/g, ''),
    })
    setWord(updated)
    setAccented(updated.accented)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function handleDelete() {
    if (!word) return
    await api.delete(`/nouns/${word.id}`)
    navigate('/words/add')
  }

  if (!word) return <div><Nav /><p>Loading…</p></div>

  return (
    <div>
      <Nav />
      <h1>{word.accented}</h1>
      <p className="text-muted">{word.pos}</p>
      {id && <LexemeTagEditor lexemeId={Number(id)} />}

      {langs.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {langs.map(lang => (
            <TranslationRow
              key={lang}
              lang={lang}
              items={translations.filter(t => t.lang === lang)}
              searchWord={word?.lemma}
              onAdd={text => addTranslation(lang, text)}
              onUpdate={(tid, text) => updateTranslation(tid, text)}
              onDelete={tid => deleteTranslation(tid)}
            />
          ))}
        </div>
      )}

      <form onSubmit={saveAccented} style={{ marginTop: '1rem' }}>
        <label>
          Accented form:{' '}
          <input
            value={accented}
            onChange={e => setAccented(e.target.value)}
            style={{ width: '14rem' }}
          />
        </label>
        {' '}
        <button type="submit">Save</button>
        {saved && <span style={{ marginLeft: '0.5em', color: 'green' }}>Saved</span>}
      </form>

      {id && <FrequencySection lexemeId={Number(id)} />}

      <div style={{ marginTop: '2rem' }}>
        {!confirming
          ? <button className="text-danger" onClick={() => setConfirming(true)}>Delete</button>
          : <>
              <span>Delete {word.accented}? </span>
              <button style={{ background: '#c00', color: 'white' }} onClick={handleDelete}>Yes, delete</button>
              {' '}
              <button onClick={() => setConfirming(false)}>Cancel</button>
            </>
        }
      </div>
    </div>
  )
}

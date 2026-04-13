import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Entry, LexemeTranslation } from '../types'
import { Nav } from '../components/Nav'
import { TranslationRow } from '../components/TranslationRow'

export default function WordPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [word, setWord] = useState<Entry | null>(null)
  const [accented, setAccented] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [langs, setLangs] = useState<string[]>([])
  const [translations, setTranslations] = useState<LexemeTranslation[]>([])

  useEffect(() => {
    if (id) {
      api.get<Entry>(`/words/${id}`).then(w => {
        setWord(w)
        setAccented(w.accented)
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

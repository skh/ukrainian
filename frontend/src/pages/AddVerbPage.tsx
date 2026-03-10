import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { parseGoroh, VerbFormData } from '../utils/gorohParser'
import { FormsTable } from '../components/FormsTable'
import { stripAccent } from '../utils/forms'
import { Verb } from '../types'

export default function AddVerbPage() {
  const [verbs, setVerbs] = useState<Verb[]>([])
  const [infinitive, setInfinitive] = useState('')
  const [accented, setAccented] = useState('')
  const [aspect, setAspect] = useState<'ipf' | 'pf'>('ipf')
  const [derivedFrom, setDerivedFrom] = useState('')
  const [aspectPartner, setAspectPartner] = useState('')
  const [forms, setForms] = useState<VerbFormData[]>([])
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get<Verb[]>('/verbs').then(setVerbs)
  }, [])

  function handlePaste() {
    setParseError('')
    const result = parseGoroh(pasteText)
    if (!result) {
      setParseError('Could not parse — make sure you copied the full page text from goroh.pp.ua.')
      return
    }
    setInfinitive(stripAccent(result.infinitive))
    setAccented(result.infinitive)
    setAspect(result.aspect)
    setForms(result.forms)
  }

  function findVerbByAccented(value: string): Verb | undefined {
    return verbs.find(v => v.accented === value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    if (derivedFrom && !findVerbByAccented(derivedFrom)) {
      setMessage('Error: "derived from" verb not found. Select a verb from the list.')
      return
    }
    if (aspectPartner && !findVerbByAccented(aspectPartner)) {
      setMessage('Error: aspect partner verb not found. Select a verb from the list.')
      return
    }

    try {
      const verb = await api.post<Verb>('/verbs', { infinitive, accented, aspect })

      if (forms.length > 0) {
        await api.post('/verb-forms', { verb_id: verb.id, forms })
      }

      if (derivedFrom) {
        const source = findVerbByAccented(derivedFrom)!
        await api.post('/derivations', {
          source_verb_id: source.id,
          derived_verb_id: verb.id,
        })
      }

      if (aspectPartner) {
        const partner = findVerbByAccented(aspectPartner)!
        await api.post('/aspect-pairs', {
          ipf_verb_id: aspect === 'ipf' ? verb.id : partner.id,
          pf_verb_id: aspect === 'pf' ? verb.id : partner.id,
        })
      }

      setMessage(`"${accented}" added successfully.`)
      setInfinitive('')
      setAccented('')
      setAspect('ipf')
      setDerivedFrom('')
      setAspectPartner('')
      setForms([])
      setPasteText('')
      setVerbs(await api.get<Verb[]>('/verbs'))
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div>
      <Link to="/">← Back to verb list</Link>
      <h1>Add Verb</h1>

      <h2>Import from goroh.pp.ua</h2>
      Paste the full page text for a verb from goroh.pp.ua:<br />
      <textarea
        rows={6}
        cols={60}
        value={pasteText}
        onChange={e => setPasteText(e.target.value)}
        placeholder="Paste goroh.pp.ua text here..."
      /><br />
      <button type="button" onClick={handlePaste}>Parse</button>
      {parseError && <span> {parseError}</span>}
      <br /><br />

      <h2>Verb details</h2>
      <form onSubmit={handleSubmit}>
        Infinitive:<br />
        <input
          value={infinitive}
          onChange={e => setInfinitive(e.target.value)}
          required
        /><br /><br />

        Infinitive with stress:<br />
        <input
          value={accented}
          onChange={e => setAccented(e.target.value)}
          required
        /><br /><br />

        Aspect:<br />
        <select value={aspect} onChange={e => setAspect(e.target.value as 'ipf' | 'pf')}>
          <option value="ipf">imperfective (ipf)</option>
          <option value="pf">perfective (pf)</option>
        </select><br /><br />

        Derived from (optional):<br />
        <input
          list="verb-list"
          value={derivedFrom}
          onChange={e => setDerivedFrom(e.target.value)}
          placeholder="Type to search..."
        /><br /><br />

        Aspect partner (optional):<br />
        <input
          list="verb-list"
          value={aspectPartner}
          onChange={e => setAspectPartner(e.target.value)}
          placeholder="Type to search..."
        /><br /><br />

        <datalist id="verb-list">
          {verbs.map(v => (
            <option key={v.id} value={v.accented}>{v.aspect}</option>
          ))}
        </datalist>

        {forms.length > 0 && (
          <>
            Conjugation forms:<br /><br />
            <FormsTable forms={forms} />
            <br />
          </>
        )}

        <button type="submit">Add verb</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  )
}

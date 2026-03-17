import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { api } from '../api/client'
import { FormsTable } from '../components/FormsTable'
import { parseGoroh, VerbFormData } from '../utils/gorohParser'
import { Verb, AspectPair, VerbFormRead, DerivationType, Derivation } from '../types'
import { stripAccent } from '../utils/forms'


export default function EditVerbPage() {
  const { id } = useParams<{ id: string }>()
  const verbId = Number(id)
  const navigate = useNavigate()

  const [verb, setVerb] = useState<Verb | null>(null)
  const [allVerbs, setAllVerbs] = useState<Verb[]>([])
  const [pairs, setPairs] = useState<AspectPair[]>([])
  const [derivations, setDerivations] = useState<Derivation[]>([])
  const [forms, setForms] = useState<VerbFormRead[]>([])
  const [replaceText, setReplaceText] = useState('')
  const [replaceForms, setReplaceForms] = useState<VerbFormData[]>([])
  const [replaceError, setReplaceError] = useState('')
  const [newPartner, setNewPartner] = useState('')
  const [newDerivVerb, setNewDerivVerb] = useState('')
  const [newDerivType, setNewDerivType] = useState<DerivationType | ''>('')
  const [newDerivValue, setNewDerivValue] = useState('')
  const [editDerivId, setEditDerivId] = useState<number | null>(null)
  const [editDerivType, setEditDerivType] = useState<DerivationType | ''>('')
  const [editDerivValue, setEditDerivValue] = useState('')
  const [knownAffixes, setKnownAffixes] = useState<string[]>([])
const [editInfinitive, setEditInfinitive] = useState('')
  const [editAccented, setEditAccented] = useState('')
  const [editAspect, setEditAspect] = useState<'ipf' | 'pf'>('ipf')
  const [message, setMessage] = useState('')

  async function load() {
    const [verbs, allPairs, allDerivs, verbForms] = await Promise.all([
      api.get<Verb[]>('/verbs'),
      api.get<AspectPair[]>('/aspect-pairs'),
      api.get<Derivation[]>('/derivations'),
      api.get<VerbFormRead[]>(`/verb-forms/${verbId}`),
    ])
    const found = verbs.find(v => v.id === verbId) ?? null
    setVerb(found)
    if (found) {
      setEditInfinitive(found.infinitive)
      setEditAccented(found.accented)
      setEditAspect(found.aspect)
    }
    setAllVerbs(verbs.filter(v => v.id !== verbId))
    setPairs(allPairs.filter(p => p.ipf_verb_id === verbId || p.pf_verb_id === verbId))
    setDerivations(allDerivs.filter(d => d.source_verb_id === verbId || d.derived_verb_id === verbId))
    setForms(verbForms)
    setKnownAffixes(await api.get<string[]>('/derivations/affixes'))
  }

  useEffect(() => { load() }, [verbId])

  async function removeAspectPair(pairId: number) {
    await api.delete(`/aspect-pairs/${pairId}`)
    await load()
  }

  async function addAspectPair() {
    if (!verb || !newPartner) return
    const partner = allVerbs.find(v => v.accented === newPartner || stripAccent(v.accented) === stripAccent(newPartner))
    if (!partner) { setMessage('Partner verb not found — select from the list.'); return }
    try {
      await api.post('/aspect-pairs', {
        ipf_verb_id: verb.aspect === 'ipf' ? verb.id : partner.id,
        pf_verb_id:  verb.aspect === 'pf'  ? verb.id : partner.id,
      })
      setNewPartner('')
      setMessage('')
      await load()
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function markAsSolo() {
    if (!verb) return
    try {
      await api.post('/aspect-pairs/solo', { verb_id: verb.id })
      setMessage('')
      await load()
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function addPartnerToSoloPair(pairId: number) {
    if (!newPartner) return
    const partner = allVerbs.find(v => v.accented === newPartner || stripAccent(v.accented) === stripAccent(newPartner))
    if (!partner) { setMessage('Partner verb not found — select from the list.'); return }
    try {
      await api.patch(`/aspect-pairs/${pairId}`, { verb_id: partner.id })
      setNewPartner('')
      setMessage('')
      await load()
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  function startEditDerivation(d: Derivation) {
    setEditDerivId(d.id)
    setEditDerivType(d.type ?? '')
    setEditDerivValue(d.value ?? '')
  }

  async function saveDerivation(derivId: number) {
    try {
      await api.put(`/derivations/${derivId}`, {
        type: editDerivType || null,
        value: editDerivValue || null,
      })
      setEditDerivId(null)
      setMessage('')
      await load()
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function removeDerivation(derivId: number) {
    await api.delete(`/derivations/${derivId}`)
    await load()
  }

  async function addDerivation() {
    if (!verb || !newDerivVerb) return
    const other = allVerbs.find(v => v.accented === newDerivVerb)
    if (!other) { setMessage('Verb not found — select from the list.'); return }
    try {
      await api.post('/derivations', {
        source_verb_id:  other.id,
        derived_verb_id: verb.id,
        type: newDerivType || null,
        value: newDerivValue || null,
      })
      setNewDerivVerb('')
      setNewDerivType('')
      setNewDerivValue('')
      setMessage('')
      await load()
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

async function editForm(id: number, value: string) {
    const updated = await api.put<VerbFormRead>(`/verb-forms/form/${id}`, { form: value })
    setForms(prev => prev.map(f => f.id === id ? { ...f, form: updated.form } : f))
  }

  function handleReplaceTextChange(text: string) {
    setReplaceText(text)
    setReplaceError('')
    if (!text.trim()) { setReplaceForms([]); return }
    const result = parseGoroh(text)
    if (!result) {
      setReplaceError('Could not parse — make sure you copied the full page text from goroh.pp.ua.')
      setReplaceForms([])
    } else {
      setReplaceForms(result.forms)
    }
  }

  async function confirmReplace() {
    if (replaceForms.length === 0) return
    try {
      await api.delete(`/verb-forms/${verbId}`)
      await api.post('/verb-forms', { verb_id: verbId, forms: replaceForms })
      setReplaceText('')
      setReplaceForms([])
      setReplaceError('')
      await load()
    } catch (err) {
      setReplaceError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function saveVerb() {
    try {
      await api.put(`/verbs/${verbId}`, {
        infinitive: editInfinitive,
        accented: editAccented,
        aspect: editAspect,
      })
      setMessage('Saved.')
      await load()
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function deleteVerb() {
    if (!verb || !confirm(`Delete "${verb.accented}"? This will also remove its aspect pairs and derivations.`)) return
    try {
      await api.delete(`/verbs/${verbId}`)
      navigate('/')
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (!verb) return <p>Loading...</p>

  const oppositeAspect = verb.aspect === 'ipf' ? 'pf' : 'ipf'
  const oppositeVerbs = allVerbs.filter(v => v.aspect === oppositeAspect)
  const derivedFromMe = derivations.filter(d => d.source_verb_id === verbId)
  const iDerivedFrom = derivations.filter(d => d.derived_verb_id === verbId)

  return (
    <div>
      <Nav />
      <h1>{verb.accented} ({verb.aspect})</h1>

      <h2>Verb</h2>
      <label>
        Infinitive:<br />
        <input value={editInfinitive} onChange={e => setEditInfinitive(e.target.value)} />
      </label>
      <br /><br />
      <label>
        Infinitive with stress:<br />
        <input value={editAccented} onChange={e => setEditAccented(e.target.value)} />
      </label>
      <br /><br />
      <label>
        Aspect:{' '}
        <select value={editAspect} onChange={e => setEditAspect(e.target.value as 'ipf' | 'pf')}>
          <option value="ipf">imperfective (ipf)</option>
          <option value="pf">perfective (pf)</option>
        </select>
      </label>
      <br /><br />
      <button className="btn-primary" onClick={saveVerb}>Save</button>

      <h2>Aspect partners</h2>
      {pairs.length === 0
        ? <p>None.</p>
        : <table>
            <thead>
              <tr><th>Imperfective</th><th>Perfective</th><th></th></tr>
            </thead>
            <tbody>
              {pairs.map(p => (
                <tr key={p.id}>
                  <td>{p.ipf_verb?.accented ?? <em style={{ color: '#aaa' }}>—</em>}</td>
                  <td>{p.pf_verb?.accented ?? <em style={{ color: '#aaa' }}>—</em>}</td>
                  <td><button onClick={() => removeAspectPair(p.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
      }
      {(() => {
        const soloPair = pairs.find(p => p.ipf_verb_id === null || p.pf_verb_id === null)
        if (soloPair) {
          return (
            <>
              <br />
              <em>This verb has no aspect partner (solo).</em><br /><br />
              Add {oppositeAspect} partner:<br />
              <input
                list="partner-list"
                value={newPartner}
                onChange={e => setNewPartner(e.target.value)}
                placeholder="Type to search..."
              />
              <datalist id="partner-list">
                {oppositeVerbs.flatMap(v => [
                  <option key={v.id} value={v.accented} />,
                  <option key={`${v.id}-plain`} value={stripAccent(v.accented)} />,
                ])}
              </datalist>
              {' '}<button onClick={() => addPartnerToSoloPair(soloPair.id)}>Add partner</button>
            </>
          )
        }
        if (pairs.length === 0) {
          return (
            <>
              <br />
              Add {oppositeAspect} partner:<br />
              <input
                list="partner-list"
                value={newPartner}
                onChange={e => setNewPartner(e.target.value)}
                placeholder="Type to search..."
              />
              <datalist id="partner-list">
                {oppositeVerbs.flatMap(v => [
                  <option key={v.id} value={v.accented} />,
                  <option key={`${v.id}-plain`} value={stripAccent(v.accented)} />,
                ])}
              </datalist>
              {' '}<button onClick={addAspectPair}>Add</button>
              {' '}<button onClick={markAsSolo}>Mark as solo</button>
            </>
          )
        }
        return null
      })()}

      <h2>Derived from</h2>
      {iDerivedFrom.length === 0
        ? <p>None.</p>
        : <table>
            <thead>
              <tr><th>Source</th><th>Type</th><th>Value</th><th></th></tr>
            </thead>
            <tbody>
              {iDerivedFrom.map(d => (
                <tr key={d.id}>
                  <td><Link to={`/verbs/${d.source_verb.id}/edit`}>{d.source_verb.accented}</Link></td>
                  {editDerivId === d.id ? (
                    <>
                      <td>
                        <select value={editDerivType} onChange={e => setEditDerivType(e.target.value as DerivationType | '')}>
                          <option value="">— none —</option>
                          <option value="prefix">prefix</option>
                          <option value="suffix">suffix</option>
                          <option value="stem_change">stem change</option>
                          <option value="stress_change">stress change</option>
                          <option value="reflexive">reflexive</option>
                        </select>
                      </td>
                      <td>
                        {(editDerivType === 'prefix' || editDerivType === 'suffix') && (
                          <input list="affix-list" value={editDerivValue} onChange={e => setEditDerivValue(e.target.value)} placeholder="affix value…" />
                        )}
                      </td>
                      <td>
                        <button onClick={() => saveDerivation(d.id)}>Save</button>{' '}
                        <button onClick={() => setEditDerivId(null)}>Cancel</button>{' '}
                        <button onClick={() => removeDerivation(d.id)}>Remove</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{d.type ?? '—'}</td>
                      <td>{d.value ?? '—'}</td>
                      <td>
                        <button onClick={() => startEditDerivation(d)}>Edit</button>{' '}
                        <button onClick={() => removeDerivation(d.id)}>Remove</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
      }
      {iDerivedFrom.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          {verb.accented} is derived from:
          <input
            list="deriv-list"
            value={newDerivVerb}
            onChange={e => setNewDerivVerb(e.target.value)}
            placeholder="Type to search..."
          />
          <datalist id="deriv-list">
            {allVerbs.map(v => <option key={v.id} value={v.accented} />)}
          </datalist>
          Type:
          <select value={newDerivType} onChange={e => setNewDerivType(e.target.value as DerivationType | '')}>
            <option value="">— none —</option>
            <option value="prefix">prefix</option>
            <option value="suffix">suffix</option>
            <option value="stem_change">stem change</option>
            <option value="stress_change">stress change</option>
            <option value="reflexive">reflexive</option>
          </select>
          {(newDerivType === 'prefix' || newDerivType === 'suffix') && (
            <input
              list="affix-list"
              value={newDerivValue}
              onChange={e => setNewDerivValue(e.target.value)}
              placeholder="affix value…"
            />
          )}
          <button onClick={addDerivation}>Add</button>
        </div>
      )}

      <datalist id="affix-list">
        {knownAffixes.map(a => <option key={a} value={a} />)}
      </datalist>

      <h2>Derived words</h2>
      {derivedFromMe.length === 0
        ? <p>None.</p>
        : <table>
            <thead>
              <tr><th>Derived</th><th>Type</th><th>Value</th></tr>
            </thead>
            <tbody>
              {derivedFromMe.map(d => (
                <tr key={d.id}>
                  <td><Link to={`/verbs/${d.derived_verb.id}/edit`}>{d.derived_verb.accented}</Link></td>
                  <td>{d.type ?? '—'}</td>
                  <td>{d.value ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
      }

      {message && <p>{message}</p>}

      <h2>Paradigm</h2>
      {forms.length > 0
        ? <>
            <FormsTable forms={forms} onEdit={editForm} />
            <details style={{ marginTop: '1rem' }}>
              <summary>Replace all forms (paste from goroh)</summary>
              <div style={{ marginTop: '0.5rem' }}>
                <textarea
                  rows={6}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                  value={replaceText}
                  onChange={e => handleReplaceTextChange(e.target.value)}
                  placeholder="Paste goroh.pp.ua page text here…"
                />
                {replaceError && <p style={{ color: '#c00' }}>{replaceError}</p>}
                {replaceForms.length > 0 && (
                  <>
                    <p>Preview:</p>
                    <FormsTable forms={replaceForms} />
                    <button onClick={confirmReplace} style={{ marginTop: '0.5rem' }}>Confirm replace</button>
                  </>
                )}
              </div>
            </details>
          </>
        : <>
            <p>No forms yet. Paste goroh output to add them.</p>
            <textarea
              rows={6}
              style={{ width: '100%', fontFamily: 'inherit' }}
              value={replaceText}
              onChange={e => handleReplaceTextChange(e.target.value)}
              placeholder="Paste goroh.pp.ua page text here…"
            />
            {replaceError && <p style={{ color: '#c00' }}>{replaceError}</p>}
            {replaceForms.length > 0 && (
              <>
                <p>Preview:</p>
                <FormsTable forms={replaceForms} />
                <button onClick={confirmReplace} style={{ marginTop: '0.5rem' }}>Confirm replace</button>
              </>
            )}
          </>
      }

      <h2>Danger zone</h2>
      <button style={{ color: '#c00' }} onClick={deleteVerb}>Delete verb</button>
    </div>
  )
}

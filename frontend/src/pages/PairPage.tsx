import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { TranslationRow } from '../components/TranslationRow'
import { api } from '../api/client'
import { FormsTable } from '../components/FormsTable'
import { VerbFormData } from '../utils/gorohParser'
import { Tag, Chunk, VerbFrequency, AspectPair, WordFamily, Lexeme } from '../types'
import { aspectBg } from '../utils/theme'
import { gorohUrl } from '../config'
import { TagChip } from '../widgets/TagChip'
import { useTranslations } from '../hooks/useTranslations'

export default function PairPage() {
  const { id } = useParams<{ id: string }>()
  const pairId = Number(id)

  const [pair, setPair] = useState<AspectPair | null>(null)
  const [ipfForms, setIpfForms] = useState<VerbFormData[]>([])
  const [pfForms, setPfForms] = useState<VerbFormData[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [chunks, setChunks] = useState<Chunk[]>([])

  const [corpora, setCorpora] = useState<string[]>([])
  const [frequencies, setFrequencies] = useState<VerbFrequency[]>([])
  const [fetchingCorpus, setFetchingCorpus] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [wordFamilies, setWordFamilies] = useState<WordFamily[]>([])
  const { langs, translations, addTranslation, updateTranslation, deleteTranslation } = useTranslations(
    pair?.lexeme_id?.toString()
  )

  useEffect(() => {
    api.get<AspectPair>(`/aspect-pairs/${pairId}`).then(async p => {
      setPair(p)
      const [ipf, pf, ts, cks, corp, freqs] = await Promise.all([
        p.ipf_verb_id != null ? api.get<VerbFormData[]>(`/verbs/${p.ipf_verb_id}/forms`) : Promise.resolve([]),
        p.pf_verb_id != null ? api.get<VerbFormData[]>(`/verbs/${p.pf_verb_id}/forms`) : Promise.resolve([]),
        api.get<Tag[]>(`/pairs/${pairId}/tags`),
        api.get<Chunk[]>(`/pairs/${pairId}/chunks`),
        api.get<string[]>('/corpora'),
        api.get<VerbFrequency[]>(`/pairs/${pairId}/frequencies`),
      ])
      setIpfForms(ipf)
      setPfForms(pf)
      setTags(ts)
      setChunks(cks)
      setCorpora(corp)
      setFrequencies(freqs)
      setWordFamilies(await api.get<WordFamily[]>(`/pairs/${pairId}/word-families`))
    })
  }, [pairId])

  async function fetchFrequency(corpus: string) {
    setFetchingCorpus(corpus)
    setFetchError(null)
    try {
      const updated = await api.post<VerbFrequency[]>(
        `/pairs/${pairId}/fetch-frequency?corpus=${encodeURIComponent(corpus)}`,
        {}
      )
      setFrequencies(prev => {
        const next = prev.filter(f => f.corpus !== corpus)
        return [...next, ...updated]
      })
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e))
    } finally {
      setFetchingCorpus(null)
    }
  }

  async function createFamilyWithPair() {
    const f = await api.post<WordFamily>('/word-families', {})
    const lexemes = await api.get<Lexeme[]>('/lexemes')
    const lexeme = lexemes.find(l => l.pair_id === pairId)
    if (lexeme) await api.post(`/word-families/${f.id}/members/${lexeme.id}`, {})
    window.location.href = `/word-families/${f.id}`
  }

  if (!pair) return <p>Loading…</p>

  return (
    <div>
      <Nav />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', margin: '1rem 0 0.25rem' }}>
        <h1 style={{ margin: 0 }}>
          {pair.ipf_verb && (
            <a href={gorohUrl(pair.ipf_verb.infinitive)} target="_blank" rel="noreferrer"
              style={{ background: aspectBg.ipf, padding: '0.1em 0.3em', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
              {pair.ipf_verb.accented}
            </a>
          )}
          {pair.ipf_verb && pair.pf_verb && (
            <span className="text-faint" style={{ margin: '0 0.2em' }}>/</span>
          )}
          {pair.pf_verb && (
            <a href={gorohUrl(pair.pf_verb.infinitive)} target="_blank" rel="noreferrer"
              style={{ background: aspectBg.pf, padding: '0.1em 0.3em', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
              {pair.pf_verb.accented}
            </a>
          )}
        </h1>
        {tags.map(t => <TagChip key={t.id} tag={t} onRemove={() => {}} />)}
      </div>

      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85em' }}>
        {pair.ipf_verb_id != null && (
          <><Link to={`/verbs/${pair.ipf_verb_id}/edit`}>edit imperfective</Link>{pair.pf_verb_id != null && ' · '}</>
        )}
        {pair.pf_verb_id != null && (
          <Link to={`/verbs/${pair.pf_verb_id}/edit`}>edit perfective</Link>
        )}
      </p>

      {langs.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {langs.map(lang => (
            <TranslationRow
              key={lang}
              lang={lang}
              items={translations.filter(t => t.lang === lang)}
              onAdd={text => addTranslation(lang, text)}
              onUpdate={(id, text) => updateTranslation(id, text)}
              onDelete={id => deleteTranslation(id)}
            />
          ))}
        </div>
      )}

      <div className={pair.ipf_verb && pair.pf_verb ? 'two-col-grid' : undefined}>
        {pair.ipf_verb && (
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>
              <a href={gorohUrl(pair.ipf_verb.infinitive)} target="_blank" rel="noreferrer"
                style={{ background: aspectBg.ipf, display: 'inline-block', padding: '0.15em 0.5em', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
                {pair.ipf_verb.accented}
              </a>
            </h2>
            <FormsTable forms={ipfForms} />
          </div>
        )}
        {pair.pf_verb && (
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>
              <a href={gorohUrl(pair.pf_verb.infinitive)} target="_blank" rel="noreferrer"
                style={{ background: aspectBg.pf, display: 'inline-block', padding: '0.15em 0.5em', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
                {pair.pf_verb.accented}
              </a>
            </h2>
            <FormsTable forms={pfForms} />
          </div>
        )}
      </div>

      {corpora.length > 0 && pair && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Frequency</h2>
          <div style={{ overflowX: 'auto' }}><table>
            <thead>
              <tr>
                <th>Corpus</th>
                {pair.ipf_verb && <th style={{ background: aspectBg.ipf }}>{pair.ipf_verb.accented} ipm</th>}
                {pair.pf_verb && <th style={{ background: aspectBg.pf }}>{pair.pf_verb.accented} ipm</th>}
                <th>Pair ipm</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {corpora.map(corpus => {
                const ipfRow = pair.ipf_verb_id != null ? frequencies.find(f => f.verb_id === pair.ipf_verb_id && f.corpus === corpus) : undefined
                const pfRow = pair.pf_verb_id != null ? frequencies.find(f => f.verb_id === pair.pf_verb_id && f.corpus === corpus) : undefined
                const pairIpm = (ipfRow?.ipm ?? 0) + (pfRow?.ipm ?? 0) || null
                const fetching = fetchingCorpus === corpus
                const fetchedAt = ipfRow?.fetched_at
                  ? new Date(ipfRow.fetched_at).toLocaleString()
                  : null
                return (
                  <tr key={corpus}>
                    <td>{corpus}</td>
                    {pair.ipf_verb && (
                      <td style={{ background: aspectBg.ipf, textAlign: 'right' }}>
                        {ipfRow ? ipfRow.ipm.toFixed(2) : '—'}
                      </td>
                    )}
                    {pair.pf_verb && (
                      <td style={{ background: aspectBg.pf, textAlign: 'right' }}>
                        {pfRow ? pfRow.ipm.toFixed(2) : '—'}
                      </td>
                    )}
                    <td style={{ textAlign: 'right' }}>
                      {pairIpm !== null ? pairIpm.toFixed(2) : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => fetchFrequency(corpus)}
                        disabled={fetching}
                        title={fetchedAt ? `Last fetched: ${fetchedAt}` : undefined}
                      >
                        {fetching ? '…' : (ipfRow || pfRow) ? 'Refetch' : 'Fetch'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
          {fetchError && <p className="text-danger" style={{ marginTop: '0.4rem' }}>{fetchError}</p>}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Chunks</h2>
        {chunks.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem' }}>
            {chunks.map(c => (
              <li key={c.id} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.75em' }}>[{c.lang}]</span>
                  <span>{c.text}</span>
                  <Link to={`/chunks/${c.id}`} style={{ fontSize: '0.75em' }}>edit</Link>
                </div>
                {c.translations.length > 0 && (
                  <div className="text-dim" style={{ marginLeft: '1rem', marginTop: '0.15rem', fontSize: '0.85em' }}>
                    {c.translations.map(t => (
                      <span key={t.id} style={{ marginRight: '0.75rem' }}>
                        <span className="text-muted">{t.lang}:</span> {t.text}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <Link to={`/chunks/add`} style={{ fontSize: '0.9em' }}>+ Add chunk</Link>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Word families</h2>
        {wordFamilies.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {wordFamilies.map(f => (
              <div key={f.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                {f.members.map(m => (
                  m.pos === 'pair' && m.pair ? (
                    <span key={m.id} style={{ display: 'inline-flex', gap: '0.15em', fontSize: '0.9em' }}>
                      {m.pair.ipf_verb && <span className="badge" style={{ background: aspectBg.ipf }}>{m.pair.ipf_verb.accented}</span>}
                      {m.pair.pf_verb && <span className="badge" style={{ background: aspectBg.pf }}>{m.pair.pf_verb.accented}</span>}
                    </span>
                  ) : (
                    <span key={m.id} className="badge" style={{ background: '#eee', fontSize: '0.9em' }}>
                      {m.accented} <span className="text-muted" style={{ fontSize: '0.75em' }}>{m.pos}</span>
                    </span>
                  )
                ))}
                <Link to={`/word-families/${f.id}`} style={{ fontSize: '0.8em', marginLeft: '0.3rem' }}>Manage →</Link>
              </div>
            ))}
          </div>
        )}
        <button onClick={createFamilyWithPair}>New family with this pair</button>
      </div>
    </div>
  )
}

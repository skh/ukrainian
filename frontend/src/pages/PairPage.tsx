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
import { CefrLevel, cefrColor, cefrTextColor } from '../utils/cefr'
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

  const [frequencies, setFrequencies] = useState<VerbFrequency[]>([])
  const [cefrByLemma, setCefrByLemma] = useState<Map<string, string>>(new Map())
  const [variantForms, setVariantForms] = useState<Map<number, VerbFormData[]>>(new Map())

  const [wordFamilies, setWordFamilies] = useState<WordFamily[]>([])
  const { langs, translations, addTranslation, updateTranslation, deleteTranslation } = useTranslations(
    pair?.lexeme_id?.toString()
  )

  useEffect(() => {
    api.get<AspectPair>(`/aspect-pairs/${pairId}`).then(async p => {
      setPair(p)
      const [ipf, pf, ts, cks, freqs, cefr] = await Promise.all([
        p.ipf_verb_id != null ? api.get<VerbFormData[]>(`/verbs/${p.ipf_verb_id}/forms`) : Promise.resolve([]),
        p.pf_verb_id != null ? api.get<VerbFormData[]>(`/verbs/${p.pf_verb_id}/forms`) : Promise.resolve([]),
        api.get<Tag[]>(`/pairs/${pairId}/tags`),
        api.get<Chunk[]>(`/pairs/${pairId}/chunks`),
        api.get<VerbFrequency[]>(`/pairs/${pairId}/frequencies`),
        api.get<Record<string, string>>('/cefr'),
      ])
      setIpfForms(ipf)
      setPfForms(pf)
      setTags(ts)
      setChunks(cks)
      setFrequencies(freqs)
      setCefrByLemma(new Map(Object.entries(cefr)))
      const allVariants = [...(p.ipf_verb?.variants ?? []), ...(p.pf_verb?.variants ?? [])]
      const variantEntries = await Promise.all(
        allVariants.map(v => api.get<VerbFormData[]>(`/verbs/${v.id}/forms`).then(f => [v.id, f] as const))
      )
      setVariantForms(new Map(variantEntries))
      setWordFamilies(await api.get<WordFamily[]>(`/pairs/${pairId}/word-families`))
    })
  }, [pairId])

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
              searchWord={pair.ipf_verb?.infinitive ?? pair.pf_verb?.infinitive}
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
            <h2 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <a href={gorohUrl(pair.ipf_verb.infinitive)} target="_blank" rel="noreferrer"
                style={{ background: aspectBg.ipf, display: 'inline-block', padding: '0.15em 0.5em', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
                {pair.ipf_verb.accented}
              </a>
              {(() => { const l = cefrByLemma.get(pair.ipf_verb.infinitive) as CefrLevel | undefined; return l && (
                <span style={{ background: cefrColor[l], color: cefrTextColor[l], padding: '0.1em 0.4em', borderRadius: '3px', fontSize: '0.6em', fontWeight: 600 }}>{l}</span>
              )})()}
            </h2>
            <FormsTable forms={ipfForms} />
            {pair.ipf_verb.variants.map(v => (
              <div key={v.id} style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.4rem' }}>
                  <a href={gorohUrl(v.infinitive)} target="_blank" rel="noreferrer"
                    style={{ background: aspectBg.ipf, padding: '0.1em 0.4em', borderRadius: '4px', textDecoration: 'none', color: 'inherit', fontSize: '0.85em' }}>
                    {v.accented}
                  </a>
                </h3>
                <FormsTable forms={variantForms.get(v.id) ?? []} />
              </div>
            ))}
          </div>
        )}
        {pair.pf_verb && (
          <div>
            <h2 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <a href={gorohUrl(pair.pf_verb.infinitive)} target="_blank" rel="noreferrer"
                style={{ background: aspectBg.pf, display: 'inline-block', padding: '0.15em 0.5em', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
                {pair.pf_verb.accented}
              </a>
              {(() => { const l = cefrByLemma.get(pair.pf_verb.infinitive) as CefrLevel | undefined; return l && (
                <span style={{ background: cefrColor[l], color: cefrTextColor[l], padding: '0.1em 0.4em', borderRadius: '3px', fontSize: '0.6em', fontWeight: 600 }}>{l}</span>
              )})()}
            </h2>
            <FormsTable forms={pfForms} />
            {pair.pf_verb.variants.map(v => (
              <div key={v.id} style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.4rem' }}>
                  <a href={gorohUrl(v.infinitive)} target="_blank" rel="noreferrer"
                    style={{ background: aspectBg.pf, padding: '0.1em 0.4em', borderRadius: '4px', textDecoration: 'none', color: 'inherit', fontSize: '0.85em' }}>
                    {v.accented}
                  </a>
                </h3>
                <FormsTable forms={variantForms.get(v.id) ?? []} />
              </div>
            ))}
          </div>
        )}
      </div>

      {frequencies.length > 0 && pair && (() => {
        const corpora = [...new Set(frequencies.map(f => f.corpus))].sort()
        return (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Frequency</h2>
            <div style={{ overflowX: 'auto' }}><table>
              <thead>
                <tr>
                  <th>Corpus</th>
                  {pair.ipf_verb && <th style={{ background: aspectBg.ipf }}>{pair.ipf_verb.accented} ipm</th>}
                  {pair.pf_verb && <th style={{ background: aspectBg.pf }}>{pair.pf_verb.accented} ipm</th>}
                  <th>Total ipm</th>
                </tr>
              </thead>
              <tbody>
                {corpora.map(corpus => {
                  const ipfRow = pair.ipf_verb_id != null ? frequencies.find(f => f.verb_id === pair.ipf_verb_id && f.corpus === corpus) : undefined
                  const pfRow = pair.pf_verb_id != null ? frequencies.find(f => f.verb_id === pair.pf_verb_id && f.corpus === corpus) : undefined
                  const ipfVariants = pair.ipf_verb_id != null ? frequencies.filter(f => f.variant_of === pair.ipf_verb_id && f.corpus === corpus) : []
                  const pfVariants = pair.pf_verb_id != null ? frequencies.filter(f => f.variant_of === pair.pf_verb_id && f.corpus === corpus) : []
                  const totalIpm = (ipfRow?.ipm ?? 0) + ipfVariants.reduce((s, f) => s + f.ipm, 0)
                                 + (pfRow?.ipm ?? 0) + pfVariants.reduce((s, f) => s + f.ipm, 0) || null

                  const ipfVariantVerbs = pair.ipf_verb?.variants ?? []
                  const pfVariantVerbs = pair.pf_verb?.variants ?? []

                  return (
                    <>
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
                          {totalIpm !== null ? totalIpm.toFixed(2) : '—'}
                        </td>
                      </tr>
                      {ipfVariantVerbs.map(v => {
                        const vRow = frequencies.find(f => f.verb_id === v.id && f.corpus === corpus)
                        if (!vRow) return null
                        return (
                          <tr key={`${corpus}-ipf-v${v.id}`} style={{ fontSize: '0.85em', color: '#888' }}>
                            <td style={{ paddingLeft: '1.5em' }}>↳ {v.accented}</td>
                            {pair.ipf_verb && <td style={{ background: aspectBg.ipf, textAlign: 'right' }}>{vRow.ipm.toFixed(2)}</td>}
                            {pair.pf_verb && <td style={{ background: aspectBg.pf }}></td>}
                            <td></td>
                          </tr>
                        )
                      })}
                      {pfVariantVerbs.map(v => {
                        const vRow = frequencies.find(f => f.verb_id === v.id && f.corpus === corpus)
                        if (!vRow) return null
                        return (
                          <tr key={`${corpus}-pf-v${v.id}`} style={{ fontSize: '0.85em', color: '#888' }}>
                            <td style={{ paddingLeft: '1.5em' }}>↳ {v.accented}</td>
                            {pair.ipf_verb && <td style={{ background: aspectBg.ipf }}></td>}
                            {pair.pf_verb && <td style={{ background: aspectBg.pf, textAlign: 'right' }}>{vRow.ipm.toFixed(2)}</td>}
                            <td></td>
                          </tr>
                        )
                      })}
                    </>
                  )
                })}
              </tbody>
            </table></div>
          </div>
        )
      })()}

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

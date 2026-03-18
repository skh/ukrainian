import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Chunk, Tag } from '../types'
import { Nav } from '../components/Nav'
import { TagChip } from '../widgets/TagChip'
import { TagPicker } from '../widgets/TagPicker'
import { tagColor } from '../widgets/tagColor'

export default function ChunksListPage() {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [filterTagId, setFilterTagId] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<Chunk[]>('/chunks'),
      api.get<Tag[]>('/tags'),
    ]).then(([cs, tags]) => {
      setChunks(cs)
      setAllTags(tags)
    })
  }, [])

  async function addTag(chunk: Chunk, tagName: string) {
    const tag = await api.post<Tag>('/tags', { name: tagName })
    if (!allTags.some(t => t.id === tag.id)) setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
    const updated = await api.post<Chunk>(`/chunks/${chunk.id}/tags/${tag.id}`, {})
    setChunks(prev => prev.map(c => c.id === chunk.id ? updated : c))
  }

  function removeTag(chunk: Chunk, tagId: number) {
    api.delete(`/chunks/${chunk.id}/tags/${tagId}`).then(() => {
      setChunks(prev => prev.map(c =>
        c.id === chunk.id ? { ...c, tags: c.tags.filter(t => t.id !== tagId) } : c
      ))
    })
  }

  const visible = filterTagId === null
    ? chunks
    : chunks.filter(c => c.tags.some(t => t.id === filterTagId))

  const usedTagIds = new Set(chunks.flatMap(c => c.tags.map(t => t.id)))
  const usedTags = allTags.filter(t => usedTagIds.has(t.id))

  return (
    <div>
      <Nav />
      <h1>Chunks</h1>
      <Link to="/chunks/add">Add chunk</Link>
      {' | '}
      <Link to="/chunks/drill">Drill chunks</Link>
      <br /><br />
      {usedTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85em', color: '#666' }}>Filter:</span>
          {usedTags.map(t => {
            const active = filterTagId === t.id
            const { background, color } = tagColor(t.id)
            return (
              <button
                key={t.id}
                onClick={() => setFilterTagId(active ? null : t.id)}
                style={{
                  background: active ? background : '#f0f0f0',
                  color: active ? color : '#555',
                  border: active ? `1.5px solid ${color}` : '1.5px solid transparent',
                  borderRadius: '1em',
                  padding: '0.1em 0.7em',
                  fontSize: '0.8em',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {t.name}
              </button>
            )
          })}
          {filterTagId !== null && (
            <button onClick={() => setFilterTagId(null)} style={{ fontSize: '0.8em', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
              clear
            </button>
          )}
        </div>
      )}
      {visible.length === 0 ? (
        <p style={{ color: '#aaa' }}>{chunks.length === 0 ? 'No chunks yet.' : 'No chunks match this filter.'}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Text</th>
              <th>Tags</th>
              <th>Translations</th>
              <th>Lang</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(c => (
              <tr key={c.id}>
                <td>
                  <Link to={`/chunks/${c.id}`}>{c.text}</Link>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '0.3rem' }}>
                    {c.tags.map(t => <TagChip key={t.id} tag={t} onRemove={() => removeTag(c, t.id)} />)}
                    <TagPicker
                      allTags={allTags}
                      assignedTagIds={new Set(c.tags.map(t => t.id))}
                      onAdd={name => addTag(c, name)}
                    />
                  </div>
                </td>
                <td style={{ fontSize: '0.85em', color: '#555' }}>
                  {c.translations.map(t => `${t.lang}: ${t.text}`).join(' · ') || <span style={{ color: '#aaa' }}>—</span>}
                </td>
                <td style={{ fontSize: '0.85em', color: '#666' }}>{c.lang}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

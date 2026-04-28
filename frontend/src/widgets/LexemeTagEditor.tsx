import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Tag } from '../types'
import { TagChip } from './TagChip'
import { TagPicker } from './TagPicker'

interface Props {
  lexemeId: number
}

export function LexemeTagEditor({ lexemeId }: Props) {
  const [tags, setTags] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])

  useEffect(() => {
    Promise.all([
      api.get<Tag[]>(`/lexemes/${lexemeId}/tags`),
      api.get<Tag[]>('/tags'),
    ]).then(([assigned, all]) => {
      setTags(assigned)
      setAllTags(all)
    })
  }, [lexemeId])

  async function addTag(name: string) {
    const tag = await api.post<Tag>('/tags', { name })
    await api.post(`/lexemes/${lexemeId}/tags/${tag.id}`, {})
    setTags(prev => prev.some(t => t.id === tag.id) ? prev : [...prev, tag])
    setAllTags(prev => prev.some(t => t.id === tag.id) ? prev : [...prev, tag])
  }

  async function removeTag(tagId: number) {
    await api.delete(`/lexemes/${lexemeId}/tags/${tagId}`)
    setTags(prev => prev.filter(t => t.id !== tagId))
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.3rem', margin: '0.4rem 0 0.6rem' }}>
      {tags.map(t => (
        <TagChip key={t.id} tag={t} onRemove={() => removeTag(t.id)} />
      ))}
      <TagPicker
        allTags={allTags}
        assignedTagIds={new Set(tags.map(t => t.id))}
        onAdd={addTag}
      />
    </div>
  )
}

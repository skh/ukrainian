import { Tag } from '../types'
import { tagColor } from './tagColor'

interface TagChipProps {
  tag: Tag
  onRemove: () => void
}

export function TagChip({ tag, onRemove }: TagChipProps) {
  const { background, color } = tagColor(tag.id)
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25em',
      padding: '0.1em 0.45em 0.1em 0.5em',
      borderRadius: '1em',
      fontSize: '0.72em',
      fontWeight: 500,
      lineHeight: 1.5,
      background,
      color,
      whiteSpace: 'nowrap',
    }}>
      {tag.name}
      <button
        onClick={onRemove}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          padding: '0 0.1em',
          margin: 0,
          cursor: 'pointer',
          color: 'inherit',
          fontSize: '1.1em',
          lineHeight: 1,
          opacity: 0.55,
          borderRadius: '50%',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.55' }}
        title={`Remove "${tag.name}"`}
      >
        ×
      </button>
    </span>
  )
}

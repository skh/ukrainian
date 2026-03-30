import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Tag } from '../types'
import { tagColor } from './tagColor'

interface TagPickerProps {
  allTags: Tag[]
  assignedTagIds: Set<number>
  onAdd: (tagName: string) => void
}

export function TagPicker({ allTags, assignedTagIds, onAdd }: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [hovered, setHovered] = useState<number | 'create' | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Focus input when opened, reset when closed
  useEffect(() => {
    if (open) {
      setInput('')
      setHovered(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function handleOpen() {
    if (open) { setOpen(false); return }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(true)
  }

  const unassigned = allTags.filter(t => !assignedTagIds.has(t.id))
  const filtered = input.trim()
    ? unassigned.filter(t => t.name.toLowerCase().includes(input.toLowerCase()))
    : unassigned
  const exactMatch = allTags.some(t => t.name.toLowerCase() === input.trim().toLowerCase())
  const showCreate = input.trim() !== '' && !exactMatch

  function commit(name: string) {
    onAdd(name)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Enter') {
      if (hovered === 'create' && showCreate) { commit(input.trim()); return }
      if (typeof hovered === 'number') {
        const t = filtered.find(t => t.id === hovered)
        if (t) { commit(t.name); return }
      }
      if (input.trim()) commit(input.trim())
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const ids = filtered.map(t => t.id as number | 'create').concat(showCreate ? ['create'] : [])
      const cur = ids.indexOf(hovered as number | 'create')
      setHovered(ids[Math.min(cur + 1, ids.length - 1)] ?? null)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const ids = filtered.map(t => t.id as number | 'create').concat(showCreate ? ['create'] : [])
      const cur = ids.indexOf(hovered as number | 'create')
      setHovered(cur <= 0 ? null : ids[cur - 1])
    }
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        style={{
          fontSize: '0.72em',
          fontWeight: 700,
          lineHeight: 1,
          padding: '0.15em 0.5em',
          borderRadius: '1em',
          border: '1px dashed #aaa',
          background: 'transparent',
          color: '#666',
          cursor: 'pointer',
        }}
        title="Add tag"
      >
        +
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            minWidth: '160px',
            maxHeight: '220px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 6px 4px' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setHovered(null) }}
              onKeyDown={handleKeyDown}
              placeholder="Search or create…"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: '0.82em',
                padding: '3px 6px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(t => {
              const { background, color } = tagColor(t.id)
              const isHovered = hovered === t.id
              return (
                <div
                  key={t.id}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => commit(t.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    background: isHovered ? '#f5f5f5' : 'transparent',
                    fontSize: '0.82em',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background,
                    border: `1px solid ${color}`,
                    flexShrink: 0,
                  }} />
                  {t.name}
                </div>
              )
            })}

            {showCreate && (
              <div
                onMouseEnter={() => setHovered('create')}
                onMouseLeave={() => setHovered(null)}
                onClick={() => commit(input.trim())}
                style={{
                  padding: '4px 8px',
                  cursor: 'pointer',
                  background: hovered === 'create' ? '#f5f5f5' : 'transparent',
                  fontSize: '0.82em',
                  color: '#555',
                  borderTop: filtered.length > 0 ? '1px solid #eee' : 'none',
                  fontStyle: 'italic',
                }}
              >
                Create "{input.trim()}"
              </div>
            )}

            {filtered.length === 0 && !showCreate && (
              <div style={{ padding: '4px 8px', fontSize: '0.82em', color: '#aaa' }}>
                No tags yet
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

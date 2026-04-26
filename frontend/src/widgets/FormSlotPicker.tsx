import { SlotDef } from '../utils/drillSlots'

interface Props {
  slots: Set<string>
  available: SlotDef[]
  onChange: (next: Set<string>) => void
}

export function FormSlotPicker({ slots, available, onChange }: Props) {
  const allActive = available.every(s => slots.has(s.key))
  return (
    <div style={{ marginLeft: '1.5rem', marginTop: '0.3rem', marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.2rem 0.8rem' }}>
      <span
        style={{ fontSize: '0.8em', color: '#888', cursor: 'pointer', whiteSpace: 'nowrap' }}
        onClick={() => onChange(allActive ? new Set() : new Set(available.map(s => s.key)))}
      >
        {allActive ? 'none' : 'all'}
      </span>
      {available.map(s => (
        <label key={s.key} style={{ fontSize: '0.85em', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={slots.has(s.key)}
            onChange={() => {
              const next = new Set(slots)
              next.has(s.key) ? next.delete(s.key) : next.add(s.key)
              onChange(next)
            }}
          />{' '}{s.label}
        </label>
      ))}
    </div>
  )
}

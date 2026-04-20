interface Props {
  label: string
  active: boolean
  background: string
  color: string
  onToggle: () => void
}

export function FilterPill({ label, active, background, color, onToggle }: Props) {
  return (
    <button onClick={onToggle} style={{
      background: active ? background : 'transparent',
      color: active ? color : background,
      border: `2px solid ${background}`,
      borderRadius: '4px', padding: '0.2em 0.6em',
      cursor: 'pointer', fontWeight: 600, fontSize: '0.85em',
    }}>{label}</button>
  )
}

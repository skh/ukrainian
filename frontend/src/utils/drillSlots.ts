export interface SlotDef {
  key: string
  label: string
}

export const SLOTS_ALL: SlotDef[] = [
  { key: 'present,1,singular', label: 'я (present)' },
  { key: 'present,2,singular', label: 'ти (present)' },
  { key: 'present,3,singular', label: 'він/вона (present)' },
  { key: 'present,1,plural',   label: 'ми (present)' },
  { key: 'present,2,plural',   label: 'ви (present)' },
  { key: 'present,3,plural',   label: 'вони (present)' },
  { key: 'future,1,singular',  label: 'я (future)' },
  { key: 'future,2,singular',  label: 'ти (future)' },
  { key: 'future,3,singular',  label: 'він/вона (future)' },
  { key: 'future,1,plural',    label: 'ми (future)' },
  { key: 'future,2,plural',    label: 'ви (future)' },
  { key: 'future,3,plural',    label: 'вони (future)' },
  { key: 'past,masculine',        label: 'він (past)' },
  { key: 'past,feminine',         label: 'вона (past)' },
  { key: 'past,neuter',           label: 'воно (past)' },
  { key: 'past,plural',           label: 'вони (past)' },
  { key: 'imperative,2,singular', label: 'ти! (imperative)' },
  { key: 'imperative,1,plural',   label: 'ми! (imperative)' },
  { key: 'imperative,2,plural',   label: 'ви! (imperative)' },
]

// Only present + future personal forms (number drill can toggle them)
export const SLOTS_NUMBER: SlotDef[] = SLOTS_ALL.slice(0, 12)

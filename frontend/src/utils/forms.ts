import { VerbFormData } from './gorohParser'

export function stripAccent(s: string): string {
  return s.replace(/\u0301/g, '')
}

export function selectForm(
  raw: string,
  tense: VerbFormData['tense'],
  person: VerbFormData['person'],
  number: VerbFormData['number'],
): string {
  let candidates = raw.split(',').map(s => s.trim()).filter(Boolean)

  if (tense === 'imperative') {
    const filtered = candidates.filter(s => !stripAccent(s).endsWith('но'))
    if (filtered.length > 0) candidates = filtered
  }

  if (person === '1' && number === 'plural') {
    const filtered = candidates.filter(s => {
      const plain = stripAccent(s)
      return plain.endsWith('о') || plain.endsWith('ося')
    })
    if (filtered.length > 0) candidates = filtered
  }

  // For reflexive verbs: prefer -ся over -сь
  const sya = candidates.filter(s => stripAccent(s).endsWith('ся'))
  if (sya.length > 0) candidates = sya

  return candidates[0] ?? '—'
}

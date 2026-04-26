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
    // Drop particle additions (-но)
    const noNo = candidates.filter(s => !stripAccent(s).endsWith('но'))
    if (noNo.length > 0) candidates = noNo

    // 2pl: prefer -ть over -те (literary over colloquial)
    if (number === 'plural') {
      const th = candidates.filter(s => stripAccent(s).endsWith('ть'))
      if (th.length > 0) candidates = th
    }

    // 1pl: prefer -м over -мо (бері́м over бері́мо)
    if (person === '1') {
      const m = candidates.filter(s => {
        const plain = stripAccent(s)
        return plain.endsWith('м') && !plain.endsWith('мо')
      })
      if (m.length > 0) candidates = m
    }
  } else if (person === '1' && number === 'plural') {
    // Non-imperative 1pl: prefer -мо/-мося (підемо over підем)
    const mo = candidates.filter(s => {
      const plain = stripAccent(s)
      return plain.endsWith('мо') || plain.endsWith('мося')
    })
    if (mo.length > 0) candidates = mo
  }

  // For reflexive verbs: prefer -ся over -сь
  const sya = candidates.filter(s => stripAccent(s).endsWith('ся'))
  if (sya.length > 0) candidates = sya

  return candidates[0] ?? '—'
}

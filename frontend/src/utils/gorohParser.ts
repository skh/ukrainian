export interface VerbFormData {
  tense: 'present' | 'future' | 'past' | 'imperative'
  person: '1' | '2' | '3' | null
  number: 'singular' | 'plural' | null
  gender: 'masculine' | 'feminine' | 'neuter' | null
  form: string
}

export interface ParsedGoroh {
  infinitive: string
  aspect: 'ipf' | 'pf'
  forms: VerbFormData[]
}

// Split a data cell string into [singular, plural] by tabs or 2+ spaces.
function splitCells(s: string): [string, string] {
  const parts = s.includes('\t')
    ? s.split('\t').map(p => p.trim())
    : s.split(/\s{2,}/).map(p => p.trim())
  return [parts[0] ?? '', parts[1] ?? '']
}

function isBlank(s: string) {
  return !s || s === '—' || s === '-'
}

export function parseGoroh(raw: string): ParsedGoroh | null {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 3) return null

  let infinitive = lines[0]
  const aspect: 'ipf' | 'pf' = raw.includes('недоконаний вид') ? 'ipf' : 'pf'
  const forms: VerbFormData[] = []

  const SKIP = new Set([
    'дієслово', 'доконаний вид', 'недоконаний вид',
    'особова форма', 'нерефлексивне', 'рефлексивне',
  ])
  // Also skip conjugation class lines like "1 дієвідміна", "2 дієвідміна"
  const skipLine = (l: string) => SKIP.has(l) || /^\d+ дієвідміна$/.test(l)

  type Tense = VerbFormData['tense']
  let section: Tense | 'infinitive' | '' = ''

  function add(
    tense: Tense,
    person: VerbFormData['person'],
    number: VerbFormData['number'],
    gender: VerbFormData['gender'],
    form: string,
  ) {
    if (!isBlank(form)) forms.push({ tense, person, number, gender, form: form.trim() })
  }

  for (const line of lines) {
    if (skipLine(line)) continue
    if (line.startsWith('Однина') || line.startsWith('Множина')) continue
    if (line.startsWith('Інфінітив')) {
      const content = line.slice('Інфінітив'.length).trim()
      if (content) {
        const candidates = content.split(',').map(s => s.trim()).filter(Boolean)
        const sya = candidates.find(s => s.replace(/\u0301/g, '').endsWith('ся'))
        infinitive = sya ?? candidates[0]
      }
      section = 'infinitive'
      continue
    }
    if (line === 'Наказовий спосіб') { section = 'imperative'; continue }
    if (line === 'Майбутній час')    { section = 'future';      continue }
    if (line === 'Теперішній час')   { section = 'present';     continue }
    if (line === 'Минулий час')      { section = 'past';        continue }
    if (line === 'Безособова форма') { section = '';            continue }

    // Person rows: "1 особа ...", "2 особа ...", "3 особа ..."
    const personMatch = line.match(/^([123]) особа(.*)/)
    if (personMatch && (section === 'present' || section === 'future' || section === 'imperative')) {
      const person = personMatch[1] as '1' | '2' | '3'
      const rest = personMatch[2].trim()
      const [sg, pl] = splitCells(rest)

      if (section === 'imperative' && person === '1') {
        // 1st person imperative has no singular; single value is plural
        add('imperative', '1', 'plural', null, sg || pl)
      } else {
        add(section, person, 'singular', null, sg)
        add(section, person, 'plural', null, pl)
      }
      continue
    }

    // Past tense gender rows
    if (section === 'past') {
      const genderMap: [string, VerbFormData['gender']][] = [
        ['чол. р.', 'masculine'],
        ['жін. р.', 'feminine'],
        ['сер. р.', 'neuter'],
      ]
      for (const [label, gender] of genderMap) {
        if (line.startsWith(label)) {
          const [sg, pl] = splitCells(line.slice(label.length).trim())
          add('past', null, 'singular', gender, sg)
          // Plural (all genders) is on the masculine row
          if (gender === 'masculine' && !isBlank(pl)) {
            add('past', null, 'plural', null, pl)
          }
          break
        }
      }
    }
  }

  return { infinitive, aspect, forms }
}

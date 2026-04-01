export interface EntryFormData {
  tags: string   // e.g. "nom,sg" or "nom,sg,m"
  form: string
}

export interface ParsedNoun {
  accented: string
  gender: 'm' | 'f' | 'n' | null  // null for pluralia tantum
  number_type: 'sg' | 'pl' | 'both'
  forms: EntryFormData[]
}

const CASE_MAP: Record<string, string> = {
  'називний': 'nom',
  'родовий': 'gen',
  'давальний': 'dat',
  'знахідний': 'acc',
  'орудний': 'ins',
  'місцевий': 'loc',
  'кличний': 'voc',
}

function isBlank(s: string): boolean {
  return !s || s === '—' || s === '-'
}

function splitCells(s: string): string[] {
  return s.includes('\t')
    ? s.split('\t').map(p => p.trim())
    : s.split(/\s{2,}/).map(p => p.trim())
}

export function parseNoun(text: string): ParsedNoun | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 3) return null

  const accented = lines[0].split(/\s+/)[0]

  if (!lines.some(l => l === 'іменник')) return null

  let gender: 'm' | 'f' | 'n' | null = null
  for (const l of lines) {
    if (l.includes('жіночий рід')) { gender = 'f'; break }
    if (l.includes('чоловічий рід')) { gender = 'm'; break }
    if (l.includes('середній рід')) { gender = 'n'; break }
    if (l === 'множинний') { gender = null; break }
  }

  const headerIdx = lines.findIndex(l => l.startsWith('відмінок'))
  if (headerIdx === -1) return null

  const forms: EntryFormData[] = []
  let sgMissing = 0
  let plMissing = 0

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCells(lines[i])
    if (cells.length < 2) continue

    const caseKey = CASE_MAP[cells[0]]
    if (!caseKey) continue

    const sgForm = cells[1] ?? ''
    const plForm = cells[2] ?? ''

    if (!isBlank(sgForm)) {
      for (const v of sgForm.split(',').map(s => s.trim()).filter(Boolean))
        forms.push({ tags: `${caseKey},sg`, form: v })
    } else {
      sgMissing++
    }

    if (!isBlank(plForm)) {
      for (const v of plForm.split(',').map(s => s.trim()).filter(Boolean))
        forms.push({ tags: `${caseKey},pl`, form: v })
    } else {
      plMissing++
    }
  }

  let number_type: 'sg' | 'pl' | 'both'
  if (plMissing === 7 && sgMissing === 0) {
    number_type = 'sg'
  } else if (sgMissing === 7 && plMissing === 0) {
    number_type = 'pl'
  } else {
    number_type = 'both'
  }

  return { accented, gender, number_type, forms }
}

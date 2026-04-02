import { EntryFormData } from './nounParser'

export interface ParsedDeclinable {
  accented: string
  pos: 'adjective' | 'pronoun' | 'numeral'
  forms: EntryFormData[]
}

const CASE_MAP: Record<string, string> = {
  'називний': 'nom',
  'родовий':  'gen',
  'давальний': 'dat',
  'знахідний': 'acc',
  'орудний':  'ins',
  'місцевий': 'loc',
  'кличний':  'voc',
}

function isBlank(s: string): boolean {
  return !s || s === '—' || s === '-'
}

function splitCells(s: string): string[] {
  return s.includes('\t')
    ? s.split('\t').map(p => p.trim())
    : s.split(/\s{2,}/).map(p => p.trim())
}

export function parseDeclinable(text: string): ParsedDeclinable | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 3) return null

  const accented = lines[0].split(/\s+/)[0]

  let pos: 'adjective' | 'pronoun' | 'numeral' | null = null
  for (const l of lines) {
    if (l.includes('прикметник')) { pos = 'adjective'; break }
    if (l.includes('займенник'))  { pos = 'pronoun';   break }
    if (l.includes('числівник'))  { pos = 'numeral';   break }
  }
  if (!pos) return null

  const headerIdx = lines.findIndex(l => l.startsWith('відмінок'))
  if (headerIdx === -1) return null

  // Determine column mode from header
  const headerCells = splitCells(lines[headerIdx])
  // headerCells[0] = 'відмінок', rest are column headers
  const colCount = headerCells.length - 1  // number of form columns

  const forms: EntryFormData[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCells(lines[i])
    if (cells.length < 2) continue
    const caseKey = CASE_MAP[cells[0]]
    if (!caseKey) continue

    if (colCount >= 4) {
      // 4-column: m, f, n, pl
      const [, m, f, n, pl] = cells
      const col4 = [
        { val: m,  tag: `${caseKey},sg,m` },
        { val: f,  tag: `${caseKey},sg,f` },
        { val: n,  tag: `${caseKey},sg,n` },
        { val: pl, tag: `${caseKey},pl`   },
      ]
      for (const { val, tag } of col4) {
        if (!val || isBlank(val)) continue
        for (const v of val.split(',').map(s => s.trim()).filter(Boolean))
          forms.push({ tags: tag, form: v })
      }
    } else if (colCount === 2) {
      // 2-column: sg, pl
      const [, sg, pl] = cells
      if (!isBlank(sg))
        for (const v of sg.split(',').map(s => s.trim()).filter(Boolean))
          forms.push({ tags: `${caseKey},sg`, form: v })
      if (!isBlank(pl))
        for (const v of pl.split(',').map(s => s.trim()).filter(Boolean))
          forms.push({ tags: `${caseKey},pl`, form: v })
    } else {
      // 1-column: sg only (most personal pronouns)
      const [, sg] = cells
      if (!isBlank(sg))
        for (const v of sg.split(',').map(s => s.trim()).filter(Boolean))
          forms.push({ tags: `${caseKey},sg`, form: v })
    }
  }

  return { accented, pos, forms }
}

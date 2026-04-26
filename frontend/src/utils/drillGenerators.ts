import { selectForm } from './forms'
import { VerbFormData } from './gorohParser'
import { Verb, PairTranslation } from '../types'

interface AspectPair {
  id: number
  ipf_verb_id: number | null
  pf_verb_id: number | null
}

interface VerbForm {
  id: number
  verb_id: number
  tense: VerbFormData['tense']
  person: VerbFormData['person']
  number: VerbFormData['number']
  gender: VerbFormData['gender']
  form: string
}

export interface PromptLine {
  text: string
  bold?: boolean
  small?: boolean
}

export interface Question {
  type: 'aspect' | 'infinitive' | 'number' | 'translation'
  prompt: string
  correctForm: string
  aspect: 'ipf' | 'pf'
  verbId: number
  targetVerbId?: number
  display?: PromptLine[]
  targetFormLabel?: string
}

function getPronoun(
  tense: VerbFormData['tense'],
  person: VerbFormData['person'],
  number: VerbFormData['number'],
  gender: VerbFormData['gender'],
): string {
  if (tense === 'past') {
    if (number === 'plural') return 'вони'
    if (gender === 'masculine') return 'він'
    if (gender === 'feminine') return 'вона'
    if (gender === 'neuter') return 'воно'
    return 'він'
  }
  if (number === 'plural') {
    if (person === '1') return 'ми'
    if (person === '2') return 'ви'
    return 'вони'
  }
  if (person === '1') return 'я'
  if (person === '2') return 'ти'
  return 'він/вона'
}

export function formLabel(
  tense: VerbFormData['tense'],
  person: VerbFormData['person'],
  number: VerbFormData['number'],
  gender: VerbFormData['gender'],
): string {
  const parts: string[] = []

  if (tense === 'present') parts.push('present')
  else if (tense === 'future') parts.push('future')
  else if (tense === 'past') parts.push('past')
  else if (tense === 'imperative') parts.push('imperative')

  if (person === '1') parts.push('1st person')
  else if (person === '2') parts.push('2nd person')
  else if (person === '3') parts.push('3rd person')

  if (number === 'singular') parts.push('singular')
  else if (number === 'plural') parts.push('plural')

  if (gender === 'masculine') parts.push('masculine')
  else if (gender === 'feminine') parts.push('feminine')
  else if (gender === 'neuter') parts.push('neuter')

  return parts.join(', ')
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function formSlotKey(f: VerbForm): string {
  return [f.tense, f.person, f.number, f.gender].filter(Boolean).join(',')
}

export function generateAspectQuestion(
  verbsMap: Map<number, Verb>,
  ps: AspectPair[],
  fMap: Map<number, VerbForm[]>,
  formSlots?: Set<string>,
): Question | null {
  const eligible = ps.filter(p =>
    p.ipf_verb_id != null && p.pf_verb_id != null &&
    fMap.has(p.ipf_verb_id) && fMap.has(p.pf_verb_id)
  )
  if (eligible.length === 0) return null

  const pair = pickRandom(eligible)
  if (pair.ipf_verb_id == null || pair.pf_verb_id == null) return null
  const goIpfToPf = Math.random() < 0.5
  const sourceId = goIpfToPf ? pair.ipf_verb_id : pair.pf_verb_id
  const targetId = goIpfToPf ? pair.pf_verb_id : pair.ipf_verb_id

  const sourceForms = fMap.get(sourceId)!
  const targetForms = fMap.get(targetId)!
  const sourceVerb = verbsMap.get(sourceId)!

  // Ignore synthetic future (ipf future). Only use: present (ipf), future (pf), imperative, past.
  let candidateForms = sourceForms.filter(f =>
    !(f.tense === 'future' && sourceVerb.aspect === 'ipf')
  )
  if (formSlots && formSlots.size > 0) {
    candidateForms = candidateForms.filter(f => formSlots.has(formSlotKey(f)))
  }
  if (candidateForms.length === 0) return null

  const sourceForm = pickRandom(candidateForms)

  // Map tenses across aspects: present (ipf) ↔ future (pf); imperative and past stay the same
  const targetTense: VerbFormData['tense'] =
    sourceForm.tense === 'present' ? 'future' :
    sourceForm.tense === 'future'  ? 'present' :
    sourceForm.tense

  const targetMatch = targetForms.find(
    f =>
      f.tense === targetTense &&
      f.person === sourceForm.person &&
      f.number === sourceForm.number &&
      f.gender === sourceForm.gender,
  )
  if (!targetMatch) return null

  const displaySourceForm = selectForm(sourceForm.form, sourceForm.tense, sourceForm.person, sourceForm.number)
  const correctForm = selectForm(targetMatch.form, targetMatch.tense, targetMatch.person, targetMatch.number)

  const pronoun = getPronoun(targetMatch.tense, targetMatch.person, targetMatch.number, targetMatch.gender)
  const targetLabel = formLabel(targetMatch.tense, targetMatch.person, targetMatch.number, targetMatch.gender)

  return {
    type: 'aspect' as const,
    prompt: `${displaySourceForm} → change the aspect`,
    correctForm,
    aspect: goIpfToPf ? 'pf' : 'ipf',
    verbId: sourceId,
    targetVerbId: targetId,
    targetFormLabel: `${pronoun} … (${targetLabel})`,
  }
}

export function generateInfinitiveQuestion(
  verbsMap: Map<number, Verb>,
  fMap: Map<number, VerbForm[]>,
  formSlots?: Set<string>,
): Question | null {
  const verbsWithForms = Array.from(fMap.keys())
  if (verbsWithForms.length === 0) return null

  const verbId = pickRandom(verbsWithForms)
  const verb = verbsMap.get(verbId)
  if (!verb) return null

  const allForms = fMap.get(verbId)!
  const forms = (formSlots && formSlots.size > 0)
    ? allForms.filter(f => formSlots.has(formSlotKey(f)))
    : allForms
  if (forms.length === 0) return null
  const form = pickRandom(forms)
  const correctForm = selectForm(form.form, form.tense, form.person, form.number)

  const pronoun = getPronoun(form.tense, form.person, form.number, form.gender)
  const isSyntheticFuture = form.tense === 'future' && verb.aspect === 'ipf'
  const rawLabel = formLabel(form.tense, form.person, form.number, form.gender)
  const label = !isSyntheticFuture && (form.tense === 'present' || form.tense === 'future')
    ? rawLabel.replace(/^present|^future/, 'non-past')
    : rawLabel
  const line2 =
    form.tense === 'imperative'
      ? `…! (${pronoun})`
      : form.tense === 'past'
      ? `вчора, ${pronoun} …`
      : `${pronoun} …${isSyntheticFuture ? ' (synthetic future)' : ''}`

  return {
    type: 'infinitive' as const,
    prompt: `Give the ${label} of "${verb.accented}"`,
    correctForm,
    aspect: verb.aspect,
    verbId,
    display: [
      { text: verb.accented, bold: true },
      { text: line2 },
      { text: label, small: true },
    ],
  }
}

export function generateTranslationQuestion(
  verbsMap: Map<number, Verb>,
  fMap: Map<number, VerbForm[]>,
  verbToLexemeId: Map<number, number>,
  pairTranslations: PairTranslation[],
  lang: string = 'de',
): Question | null {
  // Build lexeme_id → [text, ...] map for the target language
  const transByLexeme = new Map<number, string[]>()
  for (const t of pairTranslations) {
    if (t.lang === lang) {
      const arr = transByLexeme.get(t.lexeme_id) ?? []
      arr.push(t.text)
      transByLexeme.set(t.lexeme_id, arr)
    }
  }

  // Only verbs that have a lexeme with at least one translation in the target lang
  const eligible = Array.from(fMap.keys()).filter(verbId => {
    const lexemeId = verbToLexemeId.get(verbId)
    return lexemeId != null && (transByLexeme.get(lexemeId)?.length ?? 0) > 0
  })
  if (eligible.length === 0) return null

  for (let attempts = 0; attempts < 20; attempts++) {
    const verbId = pickRandom(eligible)
    const verb = verbsMap.get(verbId)
    if (!verb) continue

    // Only present and future (no past, no imperative)
    const forms = (fMap.get(verbId) ?? []).filter(
      f => f.tense === 'present' || f.tense === 'future',
    )
    if (forms.length === 0) continue

    const form = pickRandom(forms)
    const correctForm = selectForm(form.form, form.tense, form.person, form.number)

    const lexemeId = verbToLexemeId.get(verbId)!
    const translationText = (transByLexeme.get(lexemeId) ?? []).join(', ')

    const pronoun = getPronoun(form.tense, form.person, form.number, form.gender)
    const isSyntheticFuture = form.tense === 'future' && verb.aspect === 'ipf'
    const label = formLabel(form.tense, form.person, form.number, form.gender)
    const line2 = `${pronoun} …${isSyntheticFuture ? ' (synthetic future)' : ''}`

    return {
      type: 'translation' as const,
      prompt: `[${lang}: ${translationText}] — ${label}`,
      correctForm,
      aspect: verb.aspect,
      verbId,
      display: [
        { text: translationText, bold: true },
        { text: line2 },
        { text: label, small: true },
      ],
    }
  }
  return null
}

export function generateNumberQuestion(
  verbsMap: Map<number, Verb>,
  fMap: Map<number, VerbForm[]>,
  formSlots?: Set<string>,
): Question | null {
  const verbsWithForms = Array.from(fMap.keys())
  if (verbsWithForms.length === 0) return null

  const verbId = pickRandom(verbsWithForms)
  const verb = verbsMap.get(verbId)
  if (!verb) return null
  const forms = fMap.get(verbId)!

  let eligible = forms.filter(
    f =>
      (f.tense === 'present' || (f.tense === 'future' && verb.aspect === 'pf')) &&
      f.number !== null,
  )
  if (formSlots && formSlots.size > 0) {
    eligible = eligible.filter(f => formSlots.has(formSlotKey(f)))
  }
  if (eligible.length === 0) return null

  const sourceForm = pickRandom(eligible)
  const targetNumber = sourceForm.number === 'singular' ? 'plural' : 'singular'

  const targetMatch = forms.find(
    f =>
      f.tense === sourceForm.tense &&
      f.person === sourceForm.person &&
      f.number === targetNumber,
  )
  if (!targetMatch) return null

  const displaySource = selectForm(sourceForm.form, sourceForm.tense, sourceForm.person, sourceForm.number)
  const correctForm = selectForm(targetMatch.form, targetMatch.tense, targetMatch.person, targetMatch.number)

  return {
    type: 'number' as const,
    prompt: `${displaySource} → give the other number`,
    correctForm,
    aspect: verb.aspect,
    verbId,
  }
}

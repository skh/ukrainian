export interface Verb {
  id: number
  infinitive: string
  accented: string
  aspect: 'ipf' | 'pf'
}

export interface Tag {
  id: number
  name: string
}

export interface AspectPair {
  id: number
  ipf_verb_id: number | null
  pf_verb_id: number | null
  ipf_verb?: Verb
  pf_verb?: Verb
  lexeme_id: number | null
}

export interface VerbFrequency {
  id: number
  verb_id: number
  corpus: string
  ipm: number
  fetched_at: string
}

export interface LexemeTranslation {
  id: number
  lexeme_id: number
  lang: string
  text: string
}

export type PairTranslation = LexemeTranslation

export interface ChunkTranslation {
  id: number
  chunk_id: number
  lang: string
  text: string
}

export interface ChunkLink {
  id: number
  chunk_id: number
  lexeme_id: number | null
  lexeme_pos: string | null
  lexeme_form: string | null
  pair_id: number | null
  pair_label: string | null
  // for non-pair lexemes: entry_id == lexeme_id (backwards compat)
  entry_id: number | null
  entry_gender: string | null
}

export interface Chunk {
  id: number
  lang: string
  text: string
  notes: string | null
  translations: ChunkTranslation[]
  links: ChunkLink[]
  tags: Tag[]
}

export interface SuggestedLink {
  lexeme_id: number
  lexeme_pos: string
  lexeme_form: string
  matched_form: string
}

export interface PairTag {
  pair_id: number
  tag_id: number
}

export interface LexemeForm {
  id: number
  lexeme_id: number
  tags: string   // e.g. "nom,sg" or "nom,sg,m"
  form: string
}

export interface Lexeme {
  id: number
  pos: 'pair' | 'noun' | 'adjective' | 'adverb' | 'conjunction' | 'numeral' | 'preposition' | 'pronoun'
  lemma: string
  accented: string
  gender: 'm' | 'f' | 'n' | null
  number_type: 'sg' | 'pl' | 'both' | null
  pair_id: number | null
  pair?: AspectPair
  forms?: LexemeForm[]
}

export interface WordFamily {
  id: number
  members: Lexeme[]
}

// Entry is an alias for Lexeme (for backwards compat with noun/word pages)
export type Entry = Lexeme
export type EntryForm = LexemeForm

export interface AnalysisFormInfo {
  tags: string
  form: string
}

export interface AnalysisVerbInfo {
  accented: string
  aspect: 'ipf' | 'pf'
  forms: AnalysisFormInfo[]
}

export interface AnalysisTokenMatch {
  lexeme_id: number
  accented: string
  pos: string
  gender: 'm' | 'f' | 'n' | null
  translations: { lang: string; text: string }[]
  forms: AnalysisFormInfo[]
  verbs: AnalysisVerbInfo[]
}

export interface AnalyzedToken {
  text: string
  is_word: boolean
  match?: AnalysisTokenMatch
}

export interface AnalyzeResponse {
  tokens: AnalyzedToken[]
  unknown: string[]
}

export interface GorohForm {
  tags: string
  form: string
}

export interface GorohCandidate {
  goroh_id: string
  accented: string
  gloss: string | null
  pos: string
  gender: 'm' | 'f' | 'n' | null
  number_type: 'sg' | 'pl' | 'both' | null
  aspect: 'ipf' | 'pf' | null
  forms: GorohForm[]
  already_exists: boolean
  existing_id: number | null
}

export type DerivationType = 'prefix' | 'suffix' | 'stem_change' | 'stress_change' | 'reflexive'

export interface VerbFormRead {
  id: number
  verb_id: number
  tense: 'present' | 'future' | 'past' | 'imperative'
  person: '1' | '2' | '3' | null
  number: 'singular' | 'plural' | null
  gender: 'masculine' | 'feminine' | 'neuter' | null
  form: string
}

export interface Derivation {
  id: number
  source_verb_id: number
  derived_verb_id: number
  type: DerivationType | null
  value: string | null
  source_verb: Verb
  derived_verb: Verb
}

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
}

export interface VerbFrequency {
  id: number
  verb_id: number
  corpus: string
  ipm: number
  fetched_at: string
}

export interface PairTranslation {
  id: number
  pair_id: number
  lang: string
  text: string
}

export interface CollocTranslation {
  id: number
  collocation_id: number
  lang: string
  text: string
}

export interface Collocation {
  id: number
  pair_id: number
  text: string
}

export interface PairTag {
  pair_id: number
  tag_id: number
}

export interface Lexeme {
  id: number
  pos: 'pair' | 'noun' | 'adjective' | 'adverb'
  form: string
  pair_id: number | null
  pair?: AspectPair
}

export interface WordFamily {
  id: number
  members: Lexeme[]
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

export interface EntryForm {
  id: number
  entry_id: number
  tags: string   // e.g. "nom,sg" or "nom,sg,m"
  form: string
}

export interface Entry {
  id: number
  pos: 'noun' | 'adjective' | 'adverb'
  lemma: string
  accented: string
  gender: 'm' | 'f' | 'n' | null
  number_type: 'sg' | 'pl' | 'both' | null
  forms?: EntryForm[]
}

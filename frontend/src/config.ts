export const FREQ_CORPUS = 'preloaded/uktenten22_rft2'

export const externalLinks = {
  gorohBase: 'https://goroh.pp.ua/Словозміна/',
}

export function gorohUrl(infinitive: string): string {
  return externalLinks.gorohBase + encodeURIComponent(infinitive)
}

// TODO: confirm goroh URL patterns per POS and implement
export function gorohLexemeUrl(_form: string, _pos: 'noun' | 'adjective' | 'adverb' | 'conjunction' | 'numeral' | 'preposition' | 'pronoun'): string | null {
  return null
}

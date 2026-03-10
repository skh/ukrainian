export const externalLinks = {
  gorohBase: 'https://goroh.pp.ua/Словозміна/',
}

export function gorohUrl(infinitive: string): string {
  return externalLinks.gorohBase + encodeURIComponent(infinitive)
}

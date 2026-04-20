export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
export type CefrLevel = typeof CEFR_LEVELS[number]

export const cefrColor: Record<CefrLevel, string> = {
  A1: '#FFC904',
  A2: '#EE792F',
  B1: '#7AB80F',
  B2: '#729DE4',
  C1: '#EB70B1',
}

export const cefrOrder: Record<CefrLevel, number> = {
  A1: 0, A2: 1, B1: 2, B2: 3, C1: 4,
}

export function lowerCefrLevel(a: CefrLevel | undefined, b: CefrLevel | undefined): CefrLevel | undefined {
  if (!a) return b
  if (!b) return a
  return cefrOrder[a] <= cefrOrder[b] ? a : b
}

export const cefrTextColor: Record<CefrLevel, string> = {
  A1: '#000',  // yellow
  A2: '#fff',  // orange
  B1: '#fff',  // green
  B2: '#fff',  // blue
  C1: '#000',  // pink
}

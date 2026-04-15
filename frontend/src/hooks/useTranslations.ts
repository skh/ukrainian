import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { LexemeTranslation } from '../types'

export function useTranslations(id: string | undefined) {
  const [langs, setLangs] = useState<string[]>([])
  const [translations, setTranslations] = useState<LexemeTranslation[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get<string[]>('/languages'),
      api.get<LexemeTranslation[]>(`/lexemes/${id}/translations`),
    ]).then(([ls, trs]) => {
      setLangs(ls)
      setTranslations(trs)
    })
  }, [id])

  async function addTranslation(lang: string, text: string) {
    const t = await api.post<LexemeTranslation>(`/lexemes/${id}/translations`, { lang, text })
    setTranslations(prev => [...prev, t])
  }

  async function updateTranslation(tid: number, text: string) {
    const t = await api.put<LexemeTranslation>(`/lexeme-translations/${tid}`, { text })
    setTranslations(prev => prev.map(x => x.id === tid ? t : x))
  }

  async function deleteTranslation(tid: number) {
    await api.delete(`/lexeme-translations/${tid}`)
    setTranslations(prev => prev.filter(x => x.id !== tid))
  }

  return { langs, translations, setTranslations, addTranslation, updateTranslation, deleteTranslation }
}

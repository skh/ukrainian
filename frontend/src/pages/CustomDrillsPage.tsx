import { useEffect, useState } from 'react'
import { Nav } from '../components/Nav'
import { api } from '../api/client'
import { DrillConfig } from '../types'
import { FormSlotPicker } from '../widgets/FormSlotPicker'
import { SLOTS_ALL, SLOTS_NUMBER } from '../utils/drillSlots'

interface DrillTemplate {
  name: string
  typeIn: boolean
  useAspect: boolean
  useInfinitive: boolean
  useNumber: boolean
  useTranslation: boolean
  aspectFormSlots: string[]
  infinitiveFormSlots: string[]
  numberFormSlots: string[]
}

const DEFAULT_TEMPLATE: DrillTemplate = {
  name: '',
  typeIn: true,
  useAspect: true,
  useInfinitive: false,
  useNumber: false,
  useTranslation: false,
  aspectFormSlots: [],
  infinitiveFormSlots: [],
  numberFormSlots: [],
}

function templateToConfig(t: DrillTemplate): string {
  return JSON.stringify({
    typeIn: t.typeIn,
    useAspect: t.useAspect,
    useInfinitive: t.useInfinitive,
    useNumber: t.useNumber,
    useTranslation: t.useTranslation,
    aspectFormSlots: t.aspectFormSlots,
    infinitiveFormSlots: t.infinitiveFormSlots,
    numberFormSlots: t.numberFormSlots,
  })
}

function configToTemplate(cfg: DrillConfig): DrillTemplate {
  try {
    const d = JSON.parse(cfg.config)
    return {
      name: cfg.name,
      typeIn: d.typeIn ?? true,
      useAspect: d.useAspect ?? false,
      useInfinitive: d.useInfinitive ?? false,
      useNumber: d.useNumber ?? false,
      useTranslation: d.useTranslation ?? false,
      aspectFormSlots: d.aspectFormSlots ?? [],
      infinitiveFormSlots: d.infinitiveFormSlots ?? [],
      numberFormSlots: d.numberFormSlots ?? [],
    }
  } catch {
    return { ...DEFAULT_TEMPLATE, name: cfg.name }
  }
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: DrillTemplate
  onSave: (t: DrillTemplate) => void
  onCancel?: () => void
}) {
  const [t, setT] = useState<DrillTemplate>(initial)
  const set = (patch: Partial<DrillTemplate>) => setT(prev => ({ ...prev, ...patch }))

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', maxWidth: '560px' }}>
      <div style={{ marginBottom: '0.6rem' }}>
        <input
          type="text"
          placeholder="Drill name…"
          value={t.name}
          onChange={e => set({ name: e.target.value })}
          style={{ width: '100%', padding: '0.3em 0.5em', fontSize: '1em' }}
        />
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <label>
          <input type="radio" checked={t.typeIn} onChange={() => set({ typeIn: true })} />{' '}
          Type in answers
        </label>
        {'  '}
        <label>
          <input type="radio" checked={!t.typeIn} onChange={() => set({ typeIn: false })} />{' '}
          Flashcard
        </label>
      </div>

      <div>
        <label>
          <input type="checkbox" checked={t.useAspect} onChange={e => set({ useAspect: e.target.checked })} />{' '}
          Aspect form drill
        </label>
        {t.useAspect && (
          <FormSlotPicker
            slots={new Set(t.aspectFormSlots)}
            available={SLOTS_ALL}
            onChange={s => set({ aspectFormSlots: [...s] })}
          />
        )}

        <label>
          <input type="checkbox" checked={t.useInfinitive} onChange={e => set({ useInfinitive: e.target.checked })} />{' '}
          Infinitive → form drill
        </label>
        {t.useInfinitive && (
          <FormSlotPicker
            slots={new Set(t.infinitiveFormSlots)}
            available={SLOTS_ALL}
            onChange={s => set({ infinitiveFormSlots: [...s] })}
          />
        )}

        <label>
          <input type="checkbox" checked={t.useNumber} onChange={e => set({ useNumber: e.target.checked })} />{' '}
          Singular/plural drill
        </label>
        {t.useNumber && (
          <FormSlotPicker
            slots={new Set(t.numberFormSlots)}
            available={SLOTS_NUMBER}
            onChange={s => set({ numberFormSlots: [...s] })}
          />
        )}

        <label>
          <input type="checkbox" checked={t.useTranslation} onChange={e => set({ useTranslation: e.target.checked })} />{' '}
          Translation → form drill (present/future only)
        </label>
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <button
          className="btn-primary"
          onClick={() => onSave(t)}
          disabled={!t.name.trim() || (!t.useAspect && !t.useInfinitive && !t.useNumber && !t.useTranslation)}
        >
          Save
        </button>
        {onCancel && <button onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  )
}

export default function CustomDrillsPage() {
  const [configs, setConfigs] = useState<DrillConfig[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    api.get<DrillConfig[]>('/drill-configs').then(setConfigs)
  }, [])

  function createConfig(t: DrillTemplate) {
    api.post<DrillConfig>('/drill-configs', { name: t.name.trim(), config: templateToConfig(t) })
      .then(cfg => {
        setConfigs(prev => [...prev, cfg].sort((a, b) => a.name.localeCompare(b.name)))
        setShowNew(false)
      })
  }

  function updateConfig(id: number, t: DrillTemplate) {
    api.put<DrillConfig>(`/drill-configs/${id}`, { name: t.name.trim(), config: templateToConfig(t) })
      .then(cfg => {
        setConfigs(prev => prev.map(c => c.id === id ? cfg : c))
        setEditingId(null)
      })
  }

  function deleteConfig(id: number) {
    if (!confirm('Delete this drill config?')) return
    api.delete(`/drill-configs/${id}`)
      .then(() => setConfigs(prev => prev.filter(c => c.id !== id)))
  }

  return (
    <div>
      <Nav />
      <h1>Custom drills</h1>

      {configs.map(cfg => (
        <div key={cfg.id} style={{ marginBottom: '0.5rem' }}>
          {editingId === cfg.id ? (
            <TemplateForm
              initial={configToTemplate(cfg)}
              onSave={t => updateConfig(cfg.id, t)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <strong>{cfg.name}</strong>
              <span style={{ fontSize: '0.85em', color: '#777' }}>
                {(() => {
                  const d = configToTemplate(cfg)
                  const parts = [
                    d.useAspect && 'aspect',
                    d.useInfinitive && 'infinitive',
                    d.useNumber && 'sg/pl',
                    d.useTranslation && 'translation',
                  ].filter(Boolean)
                  return parts.join(', ')
                })()}
              </span>
              <button style={{ fontSize: '0.85em' }} onClick={() => setEditingId(cfg.id)}>Edit</button>
              <button style={{ fontSize: '0.85em', color: '#c00' }} onClick={() => deleteConfig(cfg.id)}>Delete</button>
            </div>
          )}
        </div>
      ))}

      {showNew ? (
        <TemplateForm
          initial={DEFAULT_TEMPLATE}
          onSave={createConfig}
          onCancel={() => setShowNew(false)}
        />
      ) : (
        <button style={{ marginTop: '0.75rem' }} onClick={() => setShowNew(true)}>
          + New custom drill
        </button>
      )}
    </div>
  )
}

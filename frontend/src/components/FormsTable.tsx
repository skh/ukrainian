import { useState } from 'react'
import { VerbFormData } from '../utils/gorohParser'
import { selectForm } from '../utils/forms'

type FormWithId = VerbFormData & { id?: number }

function getFormObj(
  forms: FormWithId[],
  tense: VerbFormData['tense'],
  person: VerbFormData['person'],
  number: VerbFormData['number'],
  gender: VerbFormData['gender'],
): FormWithId | undefined {
  return forms.find(
    f => f.tense === tense && f.person === person && f.number === number && f.gender === gender,
  )
}

function FormCell({
  form,
  tense,
  person,
  number,
  gender,
  onEdit,
}: {
  form: FormWithId | undefined
  tense: VerbFormData['tense']
  person: VerbFormData['person']
  number: VerbFormData['number']
  gender: VerbFormData['gender']
  onEdit?: (id: number, newValue: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const display = form ? selectForm(form.form, tense, person, number) : '—'

  if (!onEdit || !form?.id || !form.form) {
    return <>{display}</>
  }

  if (editing) {
    async function save() {
      if (!form?.id) return
      setSaving(true)
      try {
        await onEdit!(form.id, value)
        setEditing(false)
      } finally {
        setSaving(false)
      }
    }

    function cancel() {
      setEditing(false)
    }

    return (
      <input
        autoFocus
        value={value}
        disabled={saving}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') cancel()
        }}
        onBlur={save}
        style={{ width: '8em', font: 'inherit' }}
      />
    )
  }

  return (
    <span
      style={{ cursor: 'pointer' }}
      title="Click to edit"
      onClick={() => {
        setValue(form.form)
        setEditing(true)
      }}
    >
      {display} ✎
    </span>
  )
}

export function FormsTable({
  forms,
  onEdit,
}: {
  forms: FormWithId[]
  onEdit?: (id: number, newValue: string) => Promise<void>
}) {
  const hasFuture  = forms.some(f => f.tense === 'future')
  const hasPresent = forms.some(f => f.tense === 'present')

  function cell(
    tense: VerbFormData['tense'],
    person: VerbFormData['person'],
    number: VerbFormData['number'],
    gender: VerbFormData['gender'],
  ) {
    const form = getFormObj(forms, tense, person, number, gender)
    return <FormCell form={form} tense={tense} person={person} number={number} gender={gender} onEdit={onEdit} />
  }

  function personRows(tense: VerbFormData['tense'], persons: Array<'1' | '2' | '3'>) {
    return persons.map(p => (
      <tr key={p}>
        <td style={{ whiteSpace: 'nowrap' }}>{p} особа</td>
        <td>{cell(tense, p, 'singular', null)}</td>
        <td>{cell(tense, p, 'plural', null)}</td>
      </tr>
    ))
  }

  return (
    <table>
      <tbody>
        <tr><th colSpan={3}>Наказовий спосіб</th></tr>
        <tr><th></th><th>Однина</th><th>Множина</th></tr>
        <tr>
          <td style={{ whiteSpace: 'nowrap' }}>1 особа</td>
          <td>—</td>
          <td>{cell('imperative', '1', 'plural', null)}</td>
        </tr>
        <tr>
          <td style={{ whiteSpace: 'nowrap' }}>2 особа</td>
          <td>{cell('imperative', '2', 'singular', null)}</td>
          <td>{cell('imperative', '2', 'plural', null)}</td>
        </tr>

        {hasFuture && <>
          <tr><th colSpan={3}>Майбутній час</th></tr>
          <tr><th></th><th>Однина</th><th>Множина</th></tr>
          {personRows('future', ['1', '2', '3'])}
        </>}

        {hasPresent && <>
          <tr><th colSpan={3}>Теперішній час</th></tr>
          <tr><th></th><th>Однина</th><th>Множина</th></tr>
          {personRows('present', ['1', '2', '3'])}
        </>}

        <tr><th colSpan={3}>Минулий час</th></tr>
        <tr><th></th><th>Однина</th><th>Множина</th></tr>
        <tr>
          <td style={{ whiteSpace: 'nowrap' }}>чол. р.</td>
          <td>{cell('past', null, 'singular', 'masculine')}</td>
          <td rowSpan={3}>{cell('past', null, 'plural', null)}</td>
        </tr>
        <tr>
          <td style={{ whiteSpace: 'nowrap' }}>жін. р.</td>
          <td>{cell('past', null, 'singular', 'feminine')}</td>
        </tr>
        <tr>
          <td style={{ whiteSpace: 'nowrap' }}>сер. р.</td>
          <td>{cell('past', null, 'singular', 'neuter')}</td>
        </tr>
      </tbody>
    </table>
  )
}

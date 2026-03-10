import { VerbFormData } from '../utils/gorohParser'
import { selectForm } from '../utils/forms'

function getForm(
  forms: VerbFormData[],
  tense: VerbFormData['tense'],
  person: VerbFormData['person'],
  number: VerbFormData['number'],
  gender: VerbFormData['gender'],
): string {
  const f = forms.find(
    f => f.tense === tense && f.person === person && f.number === number && f.gender === gender,
  )
  return f ? selectForm(f.form, tense, person, number) : '—'
}

export function FormsTable({ forms }: { forms: VerbFormData[] }) {
  const hasFuture  = forms.some(f => f.tense === 'future')
  const hasPresent = forms.some(f => f.tense === 'present')

  function personRows(tense: VerbFormData['tense'], persons: Array<'1' | '2' | '3'>) {
    return persons.map(p => (
      <tr key={p}>
        <td>{p} особа</td>
        <td>{getForm(forms, tense, p, 'singular', null)}</td>
        <td>{getForm(forms, tense, p, 'plural', null)}</td>
      </tr>
    ))
  }

  return (
    <table>
      <tbody>
        <tr><th colSpan={3}>Наказовий спосіб</th></tr>
        <tr><th></th><th>Однина</th><th>Множина</th></tr>
        <tr>
          <td>1 особа</td>
          <td>—</td>
          <td>{getForm(forms, 'imperative', '1', 'plural', null)}</td>
        </tr>
        <tr>
          <td>2 особа</td>
          <td>{getForm(forms, 'imperative', '2', 'singular', null)}</td>
          <td>{getForm(forms, 'imperative', '2', 'plural', null)}</td>
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
          <td>чол. р.</td>
          <td>{getForm(forms, 'past', null, 'singular', 'masculine')}</td>
          <td rowSpan={3}>{getForm(forms, 'past', null, 'plural', null)}</td>
        </tr>
        <tr>
          <td>жін. р.</td>
          <td>{getForm(forms, 'past', null, 'singular', 'feminine')}</td>
        </tr>
        <tr>
          <td>сер. р.</td>
          <td>{getForm(forms, 'past', null, 'singular', 'neuter')}</td>
        </tr>
      </tbody>
    </table>
  )
}

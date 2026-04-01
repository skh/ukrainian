import { Link } from 'react-router-dom'

export function Nav() {
  return (
    <nav style={{ marginBottom: '1rem' }}>
      <Link to="/">Verbs</Link>
      {' | '}
      <Link to="/nouns">Nouns</Link>
      {' | '}
      <Link to="/words">Words</Link>
      {' | '}
      <Link to="/drill">Drills</Link>
      {' | '}
      <Link to="/chunks">Chunks</Link>
      {' | '}
      <Link to="/word-families">Word families</Link>
      {' | '}
      <Link to="/frequencies/refetch">Refetch frequencies</Link>
    </nav>
  )
}

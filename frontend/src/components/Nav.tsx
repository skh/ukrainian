import { Link, useLocation } from 'react-router-dom'

const DICTIONARY_PATHS = ['/', '/verbs', '/nouns', '/adjectives', '/pronouns', '/numerals', '/words']

const NAV_ITEMS = [
  { label: 'Dictionary', path: '/' },
  { label: 'Quick add',  path: '/quick-add' },
  { label: 'Drills',     path: '/drill' },
  { label: 'Custom drills', path: '/custom-drills' },
  { label: 'Analyze',    path: '/analyze' },
  { label: 'Chunks',     path: '/chunks' },
  { label: 'Word families', path: '/word-families' },
  { label: 'Ref pairs',    path: '/ref-pairs' },
  { label: 'Training',     path: '/training' },
]

export function Nav() {
  const { pathname } = useLocation()
  const inDictionary = pathname === '/' || DICTIONARY_PATHS.filter(p => p !== '/').some(p => pathname.startsWith(p))

  return (
    <nav style={{ marginBottom: '1rem', display: 'flex', gap: '0.15rem' }}>
      {NAV_ITEMS.map(item => {
        const active = item.label === 'Dictionary'
          ? inDictionary
          : pathname.startsWith(item.path)
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              padding: '0.3em 0.7em',
              textDecoration: 'none',
              borderRadius: '4px',
              background: active ? '#111' : 'transparent',
              color: active ? '#fff' : '#444',
              fontSize: '0.9em',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { label: 'Verbs',      path: '/' },
  { label: 'Nouns',      path: '/nouns' },
  { label: 'Adjectives', path: '/adjectives' },
  { label: 'Pronouns',   path: '/pronouns' },
  { label: 'Numerals',   path: '/numerals' },
  { label: 'All',        path: '/words' },
]

export function DictionaryTabs() {
  const { pathname } = useLocation()

  return (
    <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb' }}>
      {TABS.map(tab => {
        const active = tab.path === '/' ? pathname === '/' : pathname.startsWith(tab.path)
        return (
          <Link
            key={tab.path}
            to={tab.path}
            style={{
              padding: '0.4em 0.9em',
              textDecoration: 'none',
              color: active ? '#111' : '#888',
              borderBottom: active ? '2px solid #111' : '2px solid transparent',
              marginBottom: '-2px',
              fontWeight: active ? 600 : 'normal',
              fontSize: '0.95em',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

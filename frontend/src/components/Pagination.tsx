interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function Pagination({ currentPage, totalPages, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
      <button onClick={() => onPageChange(0)} disabled={currentPage === 0}>«</button>
      <button onClick={() => onPageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>‹</button>
      <span style={{ fontSize: '0.9em' }}>{currentPage + 1} / {totalPages}</span>
      <button onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1}>›</button>
      <button onClick={() => onPageChange(totalPages - 1)} disabled={currentPage === totalPages - 1}>»</button>
      <span style={{ marginLeft: '0.5rem' }}>
        {[10, 20, 50, 100].map(n => (
          <button
            key={n}
            onClick={() => { onPageSizeChange(n); onPageChange(0) }}
            style={{ marginRight: '0.25rem', fontWeight: pageSize === n ? 'bold' : 'normal' }}
          >
            {n}
          </button>
        ))}
      </span>
    </div>
  )
}

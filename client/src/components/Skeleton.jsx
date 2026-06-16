export function DashboardSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-[var(--bg-surface)] rounded w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="card h-24" />)}
      </div>
      <div className="card h-64" />
    </div>
  )
}

export function CardSkeleton({ rows = 3, height = 'h-4' }) {
  return (
    <div className="card animate-pulse space-y-3">
      <div className={`${height} bg-[var(--bg-surface)] rounded w-1/3`} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${height} bg-[var(--bg-surface)] rounded w-full`} />
      ))}
    </div>
  )
}

export function SummaryCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="card animate-pulse">
          <div className="h-4 bg-[var(--bg-surface)] rounded w-16 mb-3" />
          <div className="h-7 bg-[var(--bg-surface)] rounded w-24" />
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-1.5 h-6 rounded-full bg-[var(--bg-surface)]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-[var(--bg-surface)] rounded w-1/3" />
            <div className="h-3 bg-[var(--bg-surface)] rounded w-1/2" />
          </div>
          <div className="h-4 bg-[var(--bg-surface)] rounded w-20" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-[var(--bg-surface)] rounded w-32 mb-6" />
      <div className="h-48 bg-[var(--bg-surface)] rounded" />
    </div>
  )
}

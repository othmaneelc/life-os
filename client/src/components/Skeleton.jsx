export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card ${className}`}>
      <SkeletonLine className="w-1/3 h-4 mb-3" />
      <SkeletonLine className="w-2/3 h-8 mb-2" />
      <SkeletonLine className="w-1/2 h-4" />
    </div>
  )
}

export function SkeletonLine({ className = '' }) {
  return (
    <div className={`rounded-md animate-shimmer ${className}`} />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <SkeletonLine className="w-64 h-10 mb-2" />
      <SkeletonLine className="w-80 h-5" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
      </div>
      <SkeletonCard className="h-48" />
    </div>
  )
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({length: rows}).map((_, i) => (
        <div key={i} className="card flex items-center gap-4">
          <SkeletonLine className="w-4 h-4 rounded" />
          <div className="flex-1 space-y-1">
            <SkeletonLine className="w-3/4 h-5" />
            <SkeletonLine className="w-1/3 h-3" />
          </div>
          <SkeletonLine className="w-16 h-6 rounded-badge" />
        </div>
      ))}
    </div>
  )
}

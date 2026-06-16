import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DataError({ message = 'Failed to load data', onRetry }) {
  return (
    <div className="card text-center py-8 px-4">
      <AlertTriangle size={32} className="mx-auto mb-3 text-apple-amber" />
      <p className="text-body text-apple-muted mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-small flex items-center gap-1 mx-auto">
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  )
}

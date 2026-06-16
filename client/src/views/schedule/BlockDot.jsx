export default function BlockDot({ color }) {
  return (
    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color || 'var(--accent)' }} />
  )
}

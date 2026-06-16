import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Trash2, Clock, CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import DataError from '../components/DataError'
import { staggerContainer, staggerItem } from '../utils/animations'
import { useChores, useChoreStats, useToggleChore, useDeleteChore, useGenerateChores } from '../store/choreStore'
import PageHeader from '../components/PageHeader'

const statusIcons = { todo: Circle, inprogress: Clock, done: CheckCircle2 }
const statusColors = { todo: 'text-apple-muted', inprogress: 'text-apple-blue', done: 'text-apple-green' }
const statusLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }

function ChoreCard({ chore, onToggleDone, onDelete }) {
  const StatusIcon = statusIcons[chore.status] || statusIcons.todo

  return (
    <motion.div
      layout
      variants={staggerItem}
      initial="initial"
      animate="animate"
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 flex items-center gap-3 group hover:border-[var(--accent)]/20 transition-colors"
    >
      <button onClick={() => onToggleDone(chore)}
        className={`flex-shrink-0 transition-colors ${chore.status === 'done' ? 'text-apple-green' : 'text-apple-tertiary hover:text-apple-green'}`}
      >
        {chore.status === 'done' ? (
          <CheckCircle2 size={20} className="fill-apple-green/10" />
        ) : (
          <Circle size={20} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-body font-medium ${chore.status === 'done' ? 'line-through text-apple-tertiary' : 'text-apple-text'}`}>
            {chore.title}
          </span>
          <span className={`inline-flex items-center gap-1 text-micro px-2 py-0.5 rounded-full ${statusColors[chore.status]} bg-current/5`}>
            <StatusIcon size={10} />
            {statusLabels[chore.status] || chore.status}
          </span>
        </div>
        {chore.due_date && (
          <div className="flex items-center gap-1 mt-1 text-small text-apple-muted">
            <Clock size={12} />
            {chore.due_date}
          </div>
        )}
      </div>

      <button onClick={() => onDelete(chore.id)}
        className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-apple-tertiary hover:text-apple-red hover:bg-apple-red/10" aria-label="Delete chore"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  )
}

export default function Chores() {
  const { data: tasks, isLoading, isError, error, refetch } = useChores()
  const toggleChore = useToggleChore()
  const deleteChore = useDeleteChore()
  const generateChores = useGenerateChores()
  const stats = useChoreStats(tasks)

  function handleToggleDone(chore) {
    toggleChore.mutate({ id: chore.id, currentStatus: chore.status })
  }

  function handleDelete(id) {
    deleteChore.mutate(id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="p-8 max-w-4xl mx-auto"
    >
      <PageHeader title="Chores"
        subtitle={tasks?.length > 0 ? `${stats.done}/${stats.total} done` : undefined}
        actions={
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => generateChores.mutate()}
            disabled={generateChores.isPending}
            className="btn-primary flex items-center gap-1.5 text-small"
          >
            {generateChores.isPending ? (
              <Sparkles size={14} className="animate-pulse" />
            ) : (
              <Sparkles size={14} />
            )}
            {generateChores.isPending ? 'Generating...' : 'Generate Chores'}
          </motion.button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[var(--bg-surface)] animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-[var(--bg-surface)] rounded animate-pulse" />
                <div className="w-1/4 h-3 bg-[var(--bg-surface)] rounded animate-pulse" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <DataError message={error?.message || 'Failed to load chores'} onRetry={refetch} />
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState
          icon="schedule"
          title="No chores yet"
          description="Generate chores from your schedule blocks to get started"
          actionLabel="Generate Chores"
          onAction={() => generateChores.mutate()}
        />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
          <AnimatePresence mode="popLayout">
            {tasks.map(chore => (
              <ChoreCard key={chore.id} chore={chore}
                onToggleDone={handleToggleDone} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  )
}

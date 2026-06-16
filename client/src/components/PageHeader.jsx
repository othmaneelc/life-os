import { memo } from 'react'
import { motion } from 'framer-motion'

const PageHeader = memo(function PageHeader({ title, subtitle, icon: Icon, actions, tabs }) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-soft)' }}>
              <Icon size={20} className="text-[var(--accent)]" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-heading font-semibold text-[var(--text-primary)] truncate">{title}</h1>
            {subtitle && (
              <p className="text-small text-[var(--text-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      {tabs && tabs.length > 0 && (
        <div className="flex gap-1 mt-4 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <motion.button key={tab.key} whileTap={{ scale: 0.97 }}
              onClick={tab.onClick}
              className={`px-3 py-1.5 rounded-lg text-small font-medium whitespace-nowrap transition-colors ${
                tab.active
                  ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              style={tab.active ? { background: 'var(--accent-soft)' } : undefined}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
})

export default PageHeader

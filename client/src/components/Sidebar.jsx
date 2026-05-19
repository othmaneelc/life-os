import { memo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, CheckSquare, BookOpen,
  Moon, Dumbbell, Briefcase, Settings, BarChart3, Wallet,
  PanelLeftOpen, PanelLeftClose, Target, BookMarked
} from 'lucide-react'
import ProfileModal from './ProfileModal'
import { staggerContainer, staggerItemFast } from '../utils/animations'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/schedule', label: 'Schedule', icon: Calendar },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/prayers', label: 'Prayer Tracker', icon: Moon },
  { path: '/habits', label: 'Habits', icon: Dumbbell },
  { path: '/agency', label: 'Agency', icon: Briefcase },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/reading', label: 'Reading', icon: BookMarked },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { path: '/finance', label: 'Finance', icon: Wallet },
  { path: '/settings', label: 'Settings', icon: Settings },
]

const preloadCache = new Set()

function preloadRoute(path) {
  if (preloadCache.has(path)) return
  preloadCache.add(path)
  const routeMap = {
    '/dashboard': () => import('../views/Dashboard'),
    '/schedule': () => import('../views/Schedule'),
    '/tasks': () => import('../views/Tasks'),
    '/journal': () => import('../views/Journal'),
    '/prayers': () => import('../views/PrayerTracker'),
    '/habits': () => import('../views/Habits'),
    '/agency': () => import('../views/Agency'),
    '/reports': () => import('../views/Reports'),
    '/knowledge': () => import('../views/KnowledgeBase'),
    '/finance': () => import('../views/Finance'),
    '/goals': () => import('../views/Goals'),
    '/reading': () => import('../views/Reading'),
    '/settings': () => import('../views/Settings'),
  }
  const loader = routeMap[path]
  if (loader) loader()
}

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [avatarSrc, setAvatarSrc] = useState('/images/profile.jpg')
  const [profileOpen, setProfileOpen] = useState(false)
  const [userName, setUserName] = useState('Othmane')
  const [agencyName, setAgencyName] = useState('MIX AGENCI')

  function handleAvatarError() {
    setAvatarSrc(null)
  }

  function handleProfileSave(info) {
    if (info?.name) {
      setUserName(info.name)
      setAgencyName(info.agencyName || 'MIX AGENCI')
    }
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="min-w-[64px] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col flex-shrink-0 overflow-hidden"
    >
      <div className="flex items-center justify-end px-3 py-3 border-b border-[var(--border-color)]">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-5 py-4 border-b border-[var(--border-color)]`}
      >
        <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => setProfileOpen(true)}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="Othmane" onError={handleAvatarError}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[var(--accent)]/20 group-hover:ring-[var(--accent)]/40 transition-all" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ background: 'var(--gradient-accent)' }}>
              OE
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
            <span className="text-white text-[8px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">EDIT</span>
          </div>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col min-w-0 overflow-hidden"
            >
              <span className="text-body font-semibold text-[var(--text-primary)] truncate">{userName}</span>
              <span className="text-small text-[var(--text-muted)] truncate">{agencyName}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onSave={handleProfileSave} />

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto" {...staggerContainer}>
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <motion.button
              key={item.path}
              variants={staggerItemFast.variants}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => preloadRoute(item.path)}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg text-body font-medium transition-all duration-150 ${
                isActive ? 'sidebar-active' : 'sidebar-inactive'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--gradient-accent)' }}
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`px-5 py-4 border-t border-[var(--border-color)] ${collapsed ? 'justify-center' : 'flex items-center gap-3'}`}
      >
        {!collapsed && (
          <>
            <img src="/images/agency/icon.png" alt="" className="w-6 h-6 object-contain opacity-60" onError={e => e.target.style.display='none'} />
            <div>
              <div className="text-micro text-[var(--text-muted)] leading-tight">Life OS v2.0</div>
              <div className="text-micro text-[var(--text-tertiary)] mt-0.5">Built for Othmane Elcaidi</div>
            </div>
          </>
        )}
      </motion.div>
    </motion.aside>
  )
}

export default memo(Sidebar)

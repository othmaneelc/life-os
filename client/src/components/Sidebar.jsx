import { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Calendar, CheckSquare, BookOpen,
  Moon, Flame, ListChecks, Bed, Dumbbell, MapPin, Heart,
  BookMarked, Target, Brain, ScanEye,
  Building2, Briefcase, Wallet,
  Lock, Layers,
  BarChart3, Bot, Settings,
  Trophy, PanelLeftOpen, PanelLeftClose, Sparkles,
  User, Palette, LogOut, Search
} from 'lucide-react'
import ProfileModal from './ProfileModal'
import { LogoIcon } from './Logo'
import { useAppUIStore } from '../store/appUIStore'
import { useAuthStore } from '../store/authStore'

const NAV_SECTIONS = [
  {
    label: 'CORE',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/tasks', label: 'Tasks', icon: CheckSquare },
      { path: '/schedule', label: 'Schedule', icon: Calendar },
      { path: '/journal', label: 'Journal', icon: BookOpen },
      { path: '/prayers', label: 'Prayer Tracker', icon: Moon },
    ],
  },
  {
    label: 'LIFE',
    items: [
      { path: '/habits', label: 'Habits', icon: Flame },
      { path: '/chores', label: 'Chores', icon: ListChecks },
      { path: '/sleep', label: 'Sleep', icon: Bed },
      { path: '/workouts', label: 'Workouts', icon: Dumbbell },
      { path: '/travel', label: 'Travel', icon: MapPin },
      { path: '/relationships', label: 'Relationships', icon: Heart },
    ],
  },
  {
    label: 'GROWTH',
    items: [
      { path: '/reading', label: 'Reading', icon: BookMarked },
      { path: '/goals', label: 'Goals', icon: Target },
      { path: '/knowledge', label: 'Knowledge Base', icon: Brain },
      { path: '/black-mirror', label: 'Black Mirror', icon: ScanEye },
    ],
  },
  {
    label: 'WORK',
    items: [
      { path: '/agency', label: 'Agency', icon: Building2 },
      { path: '/client/cdz', label: 'CDZ Client', icon: Briefcase, badge: 'cdz' },
      { path: '/finance', label: 'Finance', icon: Wallet },
    ],
  },
  {
    label: 'PRIVACY',
    items: [
      { path: '/vault', label: 'Vault', icon: Lock },
      { path: '/identities', label: 'Identity Stack', icon: Layers },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/reports', label: 'Reports', icon: BarChart3 },
      { path: '/agents', label: 'Agents', icon: Bot },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const preloadCache = new Set()

const routeLoader = {
  '/dashboard': () => import('../views/Dashboard'),
  '/schedule': () => import('../views/schedule'),
  '/tasks': () => import('../views/Tasks'),
  '/journal': () => import('../views/Journal'),
  '/prayers': () => import('../views/PrayerTracker'),
  '/habits': () => import('../views/Habits'),
  '/chores': () => import('../views/Chores'),
  '/sleep': () => import('../views/Sleep'),
  '/workouts': () => import('../views/Workouts'),
  '/travel': () => import('../views/Trips'),
  '/relationships': () => import('../views/Relationships'),
  '/agency': () => import('../views/Agency'),
  '/client/cdz': () => import('../views/CDZ'),
  '/agents': () => import('../views/Agents'),
  '/reports': () => import('../views/Reports'),
  '/knowledge': () => import('../views/KnowledgeBase'),
  '/finance': () => import('../views/Finance'),
  '/goals': () => import('../views/Goals'),
  '/reading': () => import('../views/Reading'),
  '/black-mirror': () => import('../views/BlackMirror'),
  '/vault': () => import('../views/Vault'),
  '/identities': () => import('../views/IdentityStack'),
  '/settings': () => import('../views/Settings'),
}

function preloadRoute(path) {
  if (!path || preloadCache.has(path)) return
  preloadCache.add(path)
  routeLoader[path]?.()
}

function UserMenuPopover({ collapsed, userName, agencyName, avatarSrc, onOpenProfile }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-5 py-4 border-b border-[var(--border-color)] cursor-pointer relative`}
      >
        <div className="relative flex-shrink-0 group">
          <motion.div className="absolute inset-0 rounded-full"
            animate={{ boxShadow: open ? '0 0 0 3px var(--accent)' : '0 0 0 0px var(--accent)' }}
            transition={{ duration: 0.2 }} />
          {avatarSrc ? (
            <img src={avatarSrc} alt={userName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[var(--accent)]/20 group-hover:ring-[var(--accent)]/40 transition-all" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ background: 'var(--gradient-accent)' }}>{(userName || '?').charAt(0).toUpperCase()}</div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-sidebar)]"
            style={{ background: open ? 'var(--accent)' : 'var(--success)' }} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="text-body font-semibold text-[var(--text-primary)] truncate">{userName}</span>
            <span className="text-small text-[var(--text-muted)] truncate">{agencyName}</span>
          </div>
        )}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="absolute left-3 right-3 bottom-full mb-2 rounded-xl overflow-hidden z-50"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card-hover)' }}
        >
          <button onClick={() => { setOpen(false); onOpenProfile() }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-small text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
            <User size={14} /> Edit Profile
          </button>
          <button onClick={() => { setOpen(false); navigate('/settings') }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-small text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
            <Palette size={14} /> Preferences
          </button>
          <div className="h-px bg-[var(--border-color)] mx-3" />
          <button onClick={() => { setOpen(false); useAuthStore.getState().logout() }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-small text-[var(--danger)] hover:bg-[var(--bg-surface)] transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </motion.div>
      )}
    </div>
  )
}

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [avatarSrc, setAvatarSrc] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [agencyName, setAgencyName] = useState('MIX AGENCI')
  const [collapsedHover, setCollapsedHover] = useState(null)

  const handleProfileSave = useCallback((info) => {
    if (info?.name) {
      setUserName(info.name)
      setAgencyName(info.agencyName || 'MIX AGENCI')
    }
    if (info?.photo) setAvatarSrc(info.photo)
  }, [])

  const { data: userProfile } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = localStorage.getItem('lifeos-token')
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load user')
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const { data: cdzStats } = useQuery({
    queryKey: ['cdz-stats-sidebar'],
    queryFn: async () => {
      try { const r = await fetch('/api/cdz/stats'); return r.ok ? r.json() : {} }
      catch { return {} }
    },
    staleTime: 60000,
    retry: 0,
  })

  const cdzBadgeCount = (cdzStats?.overdue || 0) + (cdzStats?.pendingApprovals || 0)

  useEffect(() => {
    if (userProfile?.user) {
      setUserName(userProfile.user.name || userProfile.user.username)
      if (userProfile.user.profile_image) setAvatarSrc(userProfile.user.profile_image)
    }
  }, [userProfile])

  const handleNavClick = useCallback((path) => {
    if (path) navigate(path)
    else useAppUIStore.getState().toggleGamification()
  }, [navigate])

  const activePath = location.pathname

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="hidden md:flex min-w-[64px] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex-col flex-shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <LogoIcon size={20} animate={false} />
            <span className="text-body font-bold tracking-tight text-[var(--text-primary)]">
              Life <span className="gradient-text">OS</span>
            </span>
          </div>
        )}
        <motion.button whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </motion.button>
      </div>

      <UserMenuPopover collapsed={collapsed} userName={userName} agencyName={agencyName}
        avatarSrc={avatarSrc} onOpenProfile={() => setProfileOpen(true)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onSave={handleProfileSave} />

      {/* Search bar */}
      <div className="px-3 py-2">
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => useAppUIStore.getState().openSearch()}
          aria-label="Search"
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-surface)] transition-all text-small text-[var(--text-muted)] hover:text-[var(--text-primary)]`}
        >
          <Search size={15} />
          {!collapsed && <span className="flex-1 text-left">Search...</span>}
          {!collapsed && <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-color)]">⌘K</kbd>}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <div className="px-5 py-1.5">
                        <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--text-tertiary)]">
                  {section.label}
                </span>
              </div>
            )}
            {section.items.map((item) => {
              const isActive = activePath === item.path
              const Icon = item.icon
              return (
                <div key={item.path} className="relative px-2"
                  onMouseEnter={() => collapsed && setCollapsedHover(item.path)}
                  onMouseLeave={() => collapsed && setCollapsedHover(null)}>
                  <button
                    onClick={() => handleNavClick(item.path)}
                    onMouseEnter={() => preloadRoute(item.path)}
                    aria-label={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} py-2 rounded-lg text-body font-medium transition-all duration-100 relative ${
                      isActive ? 'sidebar-active' : 'sidebar-inactive'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className={`relative flex items-center justify-center ${collapsed ? '' : 'w-5'}`}>
                      <Icon size={18} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                      {item.badge === 'cdz' && cdzBadgeCount > 0 && (
                        <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                      )}
                    </div>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && isActive && (
                      <motion.div layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--gradient-accent)' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    )}
                  </button>
                  {/* Tooltip for collapsed state */}
                  {collapsed && collapsedHover === item.path && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-small font-medium whitespace-nowrap pointer-events-none"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card-hover)', color: 'var(--text-primary)' }}>
                      {item.label}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="flex flex-col gap-1 px-4 py-2 border-t border-[var(--border-color)]">
        <motion.button onClick={() => useAppUIStore.getState().toggleGamification()}
          whileTap={{ scale: 0.97 }}
          aria-label="Progress"
          className="w-full px-3 py-2 rounded-lg hover:bg-[var(--bg-surface)] transition-all flex items-center gap-2 text-small text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <Trophy size={14} className="text-[var(--accent)]" />
          {!collapsed && <span>Progress</span>}
        </motion.button>
        <motion.button onClick={() => useAppUIStore.getState().toggleFocus()}
          whileTap={{ scale: 0.97 }}
          aria-label="Focus Mode"
          className="w-full px-3 py-2 rounded-lg hover:bg-[var(--bg-surface)] transition-all flex items-center gap-2 text-small text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <Sparkles size={14} className="text-[var(--accent)]" />
          {!collapsed && <span>Focus Mode</span>}
        </motion.button>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-5 py-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-micro text-[var(--text-muted)] leading-tight">Life OS v2.0</div>
              <div className="text-micro text-[var(--text-tertiary)] mt-0.5">Life OS</div>
            </div>
            <div className="ml-auto"><LogoIcon size={20} animate={false} /></div>
          </div>
        </div>
      )}
    </motion.aside>
  )
}

export default memo(Sidebar)

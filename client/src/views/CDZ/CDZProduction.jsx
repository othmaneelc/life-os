import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import {
  Search, Filter, ChevronRight, CheckCircle2, Circle, AlertCircle, Clock,
  CheckSquare, Image, Video, Square, Bookmark, Edit3, Save, X,
  ChevronDown, ChevronUp, BarChart3, TrendingUp, MessageSquare,
  Eye, ThumbsUp, MessageCircle, Share2, ExternalLink, Sparkles,
  ArrowUpDown, ListFilter
} from 'lucide-react'
import toast from 'react-hot-toast'

const COLORS = {
  cyan: '#00C2FF',
  gold: '#C9A84C',
  card: '#0D0D0D',
  border: '#1A1A1A',
  surface: '#111111',
  muted: '#666',
}

const STATUS_COLORS = {
  Draft: '#666',
  'In Production': '#00C2FF',
  Review: '#FFB800',
  Approved: '#00FF87',
  Posted: '#C9A84C',
}

const PRIORITY_COLORS = {
  Low: '#666',
  Medium: '#FFB800',
  High: '#FF6B35',
  Urgent: '#FF4D4D',
}

const SECTIONS = [
  { key: 'Research', label: 'Research', emoji: '🔍' },
  { key: 'Design', label: 'Design', emoji: '🎨' },
  { key: 'Caption', label: 'Caption', emoji: '✍️' },
  { key: 'Approval', label: 'Approval', emoji: '✅' },
  { key: 'Posting', label: 'Posting', emoji: '🚀' },
]

const STATUSES = Object.keys(STATUS_COLORS)
const PRIORITIES = Object.keys(PRIORITY_COLORS)

const inputBase = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.card,
  color: '#fff',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
}

export default function CDZProduction({ posts = [], onTabChange, onNewPost }) {
  const queryClient = useQueryClient()
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('scheduled_date')
  const [statusFilter, setStatusFilter] = useState('all')
  const [mobileView, setMobileView] = useState('list')
  const [expandedSections, setExpandedSections] = useState(() => {
    const map = {}
    SECTIONS.forEach(s => { map[s.key] = true })
    return map
  })
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [editDateValue, setEditDateValue] = useState('')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [fbCaption, setFbCaption] = useState('')
  const [igCaption, setIgCaption] = useState('')
  const [reach, setReach] = useState(0)
  const [likes, setLikes] = useState(0)
  const [comments, setComments] = useState(0)
  const [saves, setSaves] = useState(0)
  const [shares, setShares] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const titleInputRef = useRef(null)
  const dateInputRef = useRef(null)
  const statusBtnRef = useRef(null)
  const fbTimerRef = useRef(null)
  const igTimerRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const selectedPost = useMemo(
    () => posts.find(p => p.id === selectedPostId) || posts.find(p => (p._id || p.id) === selectedPostId) || null,
    [posts, selectedPostId]
  )

  useEffect(() => {
    if (selectedPost) {
      setFbCaption(selectedPost.facebook_caption || '')
      setIgCaption(selectedPost.instagram_caption || '')
      setReach(selectedPost.performance_reach ?? 0)
      setLikes(selectedPost.performance_likes ?? 0)
      setComments(selectedPost.performance_comments ?? 0)
      setSaves(selectedPost.performance_saves ?? 0)
      setShares(selectedPost.performance_shares ?? 0)
    }
  }, [selectedPost])

  const { data: checklistData } = useQuery({
    queryKey: ['cdz-checklist', selectedPostId],
    queryFn: () => fetch(`/api/cdz/checklist/${selectedPostId}`).then(r => r.json()).catch(() => []),
    enabled: !!selectedPostId,
  })

  const checklistItems = useMemo(() => {
    if (!checklistData) return []
    return Array.isArray(checklistData) ? checklistData : (checklistData.items || [])
  }, [checklistData])

  const toggleChecklist = useMutation({
    mutationFn: (id) => fetch(`/api/cdz/checklist/${id}`, { method: 'PUT' }).then(r => r.json()).catch(e => { throw e }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdz-checklist'] })
    },
    onError: () => toast.error('Failed to update step'),
  })

  const updatePost = useMutation({
    mutationFn: ({ id, ...data }) =>
      fetch(`/api/cdz/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()).catch(e => { throw e }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdz-posts'] })
      queryClient.invalidateQueries({ queryKey: ['cdz-checklist'] })
      toast.success('Saved \u2713')
    },
    onError: () => toast.error('Failed to save'),
  })

  const sectionsMap = useMemo(() => {
    const map = {}
    SECTIONS.forEach(s => { map[s.key] = [] })
    checklistItems.forEach(item => {
      const section = item.section || 'Research'
      if (map[section]) map[section].push(item)
    })
    return map
  }, [checklistItems])

  const completedCount = useMemo(
    () => checklistItems.filter(i => i.is_completed).length,
    [checklistItems]
  )
  const totalCount = checklistItems.length

  const filteredPosts = useMemo(() => {
    let result = [...posts]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => (p.title || '').toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter)
    }
    const now = new Date()
    switch (sortBy) {
      case 'scheduled_date':
        result.sort((a, b) => {
          const da = a.scheduled_date ? new Date(a.scheduled_date) : now
          const db = b.scheduled_date ? new Date(b.scheduled_date) : now
          return da - db
        })
        break
      case 'status': {
        const order = { Draft: 0, 'In Production': 1, Review: 2, Approved: 3, Posted: 4 }
        result.sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0))
        break
      }
      case 'priority': {
        const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 }
        result.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3))
        break
      }
    }
    return result
  }, [posts, searchQuery, sortBy, statusFilter])

  const handleSelectPost = useCallback((post) => {
    setSelectedPostId(post.id || post._id)
    setEditingTitle(false)
    setEditingDate(false)
    setStatusDropdownOpen(false)
    if (isMobile) setMobileView('detail')
  }, [isMobile])

  const handleBackToList = useCallback(() => {
    setMobileView('list')
  }, [])

  const toggleSection = useCallback((key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleToggleStep = useCallback((item) => {
    toggleChecklist.mutate(item.id || item._id)
  }, [toggleChecklist])

  const handleTitleClick = useCallback(() => {
    if (!selectedPost) return
    setEditTitleValue(selectedPost.title || '')
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 50)
  }, [selectedPost])

  const handleTitleBlur = useCallback(() => {
    setEditingTitle(false)
    if (editTitleValue.trim() && editTitleValue !== selectedPost?.title) {
      updatePost.mutate({ id: selectedPostId, title: editTitleValue.trim() })
    }
  }, [editTitleValue, selectedPost, selectedPostId, updatePost])

  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
    if (e.key === 'Escape') {
      setEditTitleValue(selectedPost?.title || '')
      setEditingTitle(false)
    }
  }, [selectedPost])

  const handleDateClick = useCallback(() => {
    if (!selectedPost) return
    setEditDateValue(
      selectedPost.scheduled_date
        ? format(parseISO(selectedPost.scheduled_date), 'yyyy-MM-dd')
        : ''
    )
    setEditingDate(true)
    setTimeout(() => dateInputRef.current?.focus(), 50)
  }, [selectedPost])

  const handleDateBlur = useCallback(() => {
    setEditingDate(false)
    if (editDateValue) {
      updatePost.mutate({ id: selectedPostId, scheduled_date: editDateValue })
    }
  }, [editDateValue, selectedPostId, updatePost])

  const handleStatusChange = useCallback((newStatus) => {
    setStatusDropdownOpen(false)
    if (newStatus !== selectedPost?.status) {
      updatePost.mutate({ id: selectedPostId, status: newStatus })
    }
  }, [selectedPost, selectedPostId, updatePost])

  const handleFbCaptionSave = useCallback(() => {
    if (fbTimerRef.current) clearTimeout(fbTimerRef.current)
    fbTimerRef.current = setTimeout(() => {
      updatePost.mutate({ id: selectedPostId, facebook_caption: fbCaption })
    }, 600)
  }, [fbCaption, selectedPostId, updatePost])

  const handleIgCaptionSave = useCallback(() => {
    if (igTimerRef.current) clearTimeout(igTimerRef.current)
    igTimerRef.current = setTimeout(() => {
      updatePost.mutate({ id: selectedPostId, instagram_caption: igCaption })
    }, 600)
  }, [igCaption, selectedPostId, updatePost])

  const handlePerformanceBlur = useCallback((field, value) => {
    const num = parseInt(value) || 0
    updatePost.mutate({ id: selectedPostId, [field]: num })
  }, [selectedPostId, updatePost])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusBtnRef.current && !statusBtnRef.current.contains(e.target)) {
        setStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const engagementRate = useMemo(() => {
    if (!reach || reach === 0) return 0
    return (((likes + comments + saves) / reach) * 100).toFixed(1)
  }, [reach, likes, comments, saves])

  const listView = (
    <div style={{
      width: isMobile ? '100%' : '35%',
      minWidth: isMobile ? '100%' : 300,
      maxWidth: isMobile ? '100%' : '35%',
      borderRight: isMobile ? 'none' : `1px solid ${COLORS.border}`,
      display: isMobile && mobileView === 'detail' ? 'none' : 'flex',
      flexDirection: 'column',
      height: '100%',
      background: COLORS.card,
    }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: COLORS.surface,
          borderRadius: 8,
          padding: '6px 10px',
          border: `1px solid ${COLORS.border}`,
        }}>
          <Search size={14} color={COLORS.muted} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: 12,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
          <ArrowUpDown size={12} color={COLORS.muted} />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              color: '#ccc',
              fontSize: 11,
              padding: '4px 8px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="scheduled_date">By Date</option>
            <option value="status">By Status</option>
            <option value="priority">By Priority</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 10,
              border: `1px solid ${statusFilter === 'all' ? COLORS.cyan : COLORS.border}`,
              background: statusFilter === 'all' ? `${COLORS.cyan}20` : 'transparent',
              color: statusFilter === 'all' ? COLORS.cyan : COLORS.muted,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            All
          </button>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 10,
                border: `1px solid ${statusFilter === s ? STATUS_COLORS[s] : COLORS.border}`,
                background: statusFilter === s ? `${STATUS_COLORS[s]}20` : 'transparent',
                color: statusFilter === s ? STATUS_COLORS[s] : COLORS.muted,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
        {filteredPosts.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
          }}>
            <Sparkles size={32} color={COLORS.muted} />
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 500, marginTop: 12 }}>No posts found</p>
            <p style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>
              {searchQuery ? 'Try a different search term.' : 'Create a new post to get started.'}
            </p>
            {!searchQuery && onNewPost && (
              <button
                onClick={() => onNewPost()}
                style={{
                  marginTop: 16,
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: COLORS.cyan,
                  color: '#000',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                New Post
              </button>
            )}
          </div>
        ) : (
          filteredPosts.map(post => {
            const pid = post.id || post._id
            const isSelected = pid === selectedPostId
            const statusColor = STATUS_COLORS[post.status] || COLORS.muted
            return (
              <motion.button
                key={pid}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleSelectPost(post)}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: isSelected ? COLORS.surface : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                  marginBottom: 2,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = COLORS.surface }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 500,
                    color: isSelected ? '#fff' : '#ccc',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {post.title || 'Untitled'}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: `${statusColor}20`,
                    color: statusColor,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {post.status || 'Draft'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: COLORS.muted }}>
                  {post.scheduled_date && (
                    <span>{format(parseISO(post.scheduled_date), 'MMM d')}</span>
                  )}
                  {post.platform && <span>{post.platform}</span>}
                  {post.priority && (
                    <span style={{ color: PRIORITY_COLORS[post.priority] || COLORS.muted }}>
                      {post.priority}
                    </span>
                  )}
                </div>
              </motion.button>
            )
          })
        )}
      </div>
    </div>
  )

  const detailView = (
    <div style={{
      flex: 1,
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#090909',
      display: isMobile && mobileView === 'list' ? 'none' : 'flex',
    }}>
      {!selectedPost ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          textAlign: 'center',
        }}>
          <ChevronRight size={40} color={COLORS.muted} />
          <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 16 }}>
            Select a post to view its production checklist
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isMobile && (
            <button
              onClick={handleBackToList}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: COLORS.cyan,
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 0',
                marginBottom: 12,
              }}
            >
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
              Back to list
            </button>
          )}

          {/* Post Header */}
          <div style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 14,
          }}>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={editTitleValue}
                onChange={e => setEditTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                style={{
                  ...inputBase,
                  fontSize: 16,
                  fontWeight: 600,
                  padding: '6px 8px',
                  marginBottom: 10,
                }}
              />
            ) : (
              <div
                onClick={handleTitleClick}
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  margin: '-4px -6px',
                  borderRadius: 4,
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {selectedPost.title || 'Untitled'}
                <Edit3 size={12} color={COLORS.muted} />
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <div style={{ position: 'relative' }} ref={statusBtnRef}>
                <button
                  onClick={() => setStatusDropdownOpen(prev => !prev)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: `1px solid ${STATUS_COLORS[selectedPost.status] || COLORS.muted}40`,
                    background: `${STATUS_COLORS[selectedPost.status] || COLORS.muted}20`,
                    color: STATUS_COLORS[selectedPost.status] || COLORS.muted,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {selectedPost.status || 'Draft'}
                  <ChevronDown size={12} />
                </button>
                <AnimatePresence>
                  {statusDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 8,
                        overflow: 'hidden',
                        zIndex: 20,
                        minWidth: 140,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      }}
                    >
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          style={{
                            width: '100%',
                            padding: '8px 14px',
                            border: 'none',
                            background: s === selectedPost.status ? `${STATUS_COLORS[s]}20` : 'transparent',
                            color: s === selectedPost.status ? STATUS_COLORS[s] : '#ccc',
                            fontSize: 12,
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = COLORS.border}
                          onMouseLeave={e => { if (s !== selectedPost.status) e.currentTarget.style.background = 'transparent' }}
                        >
                          {s}
                          {s === selectedPost.status && <CheckCircle2 size={12} color={STATUS_COLORS[s]} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedPost.platform && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: `${COLORS.gold}20`,
                  color: COLORS.gold,
                  border: `1px solid ${COLORS.gold}30`,
                }}>
                  {selectedPost.platform}
                </span>
              )}
              {selectedPost.post_type && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: `${COLORS.cyan}20`,
                  color: COLORS.cyan,
                  border: `1px solid ${COLORS.cyan}30`,
                }}>
                  {selectedPost.post_type}
                </span>
              )}
              {selectedPost.type && !selectedPost.post_type && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: `${COLORS.cyan}20`,
                  color: COLORS.cyan,
                  border: `1px solid ${COLORS.cyan}30`,
                }}>
                  {selectedPost.type}
                </span>
              )}

              {editingDate ? (
                <input
                  ref={dateInputRef}
                  type="date"
                  value={editDateValue}
                  onChange={e => setEditDateValue(e.target.value)}
                  onBlur={handleDateBlur}
                  onKeyDown={e => { if (e.key === 'Escape') setEditingDate(false) }}
                  style={inputBase}
                  autoFocus
                />
              ) : (
                <div
                  onClick={handleDateClick}
                  style={{
                    fontSize: 11,
                    color: COLORS.muted,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 6px',
                    borderRadius: 4,
                  }}
                >
                  <Clock size={12} />
                  {selectedPost.scheduled_date
                    ? format(parseISO(selectedPost.scheduled_date), 'MMM d, yyyy')
                    : 'No date set'}
                  <Edit3 size={10} color={COLORS.muted} />
                </div>
              )}

              {selectedPost.priority && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: `${PRIORITY_COLORS[selectedPost.priority] || COLORS.muted}20`,
                  color: PRIORITY_COLORS[selectedPost.priority] || COLORS.muted,
                  border: `1px solid ${PRIORITY_COLORS[selectedPost.priority] || COLORS.muted}30`,
                }}>
                  {selectedPost.priority}
                </span>
              )}
            </div>
          </div>

          {/* Overall Progress */}
          {totalCount > 0 && (
            <div style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: 14,
              marginBottom: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                  <CheckSquare size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: COLORS.cyan }} />
                  Overall Progress
                </span>
                <span style={{ fontSize: 12, color: COLORS.muted }}>
                  {completedCount} / {totalCount} steps complete
                </span>
              </div>
              <div style={{
                width: '100%',
                height: 8,
                background: COLORS.border,
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.gold})`,
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          )}

          {/* Checklist Sections */}
          <div style={{ marginBottom: 14 }}>
            {SECTIONS.map(section => {
              const items = sectionsMap[section.key] || []
              const secCompleted = items.filter(i => i.is_completed).length
              const secTotal = items.length
              const isExpanded = expandedSections[section.key]

              return (
                <div key={section.key} style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  marginBottom: 6,
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => toggleSection(section.key)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      border: 'none',
                      background: 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{section.emoji}</span>
                      <span>{section.label}</span>
                      {secTotal > 0 && (
                        <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 400 }}>
                          {secCompleted}/{secTotal} complete
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {secTotal > 0 && (
                        <div style={{
                          width: 50,
                          height: 4,
                          background: COLORS.border,
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${(secCompleted / secTotal) * 100}%`,
                            height: '100%',
                            background: secCompleted === secTotal ? '#00FF87' : COLORS.cyan,
                            borderRadius: 2,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      )}
                      {isExpanded ? <ChevronUp size={14} color={COLORS.muted} /> : <ChevronDown size={14} color={COLORS.muted} />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={`content-${section.key}-${isExpanded}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 14px 12px' }}>
                          {items.length === 0 ? (
                            <p style={{ fontSize: 11, color: COLORS.muted, padding: '8px 0' }}>
                              No steps in this section yet.
                            </p>
                          ) : (
                            items.map(item => (
                              <motion.button
                                key={item.id || item._id}
                                layout
                                onClick={() => handleToggleStep(item)}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '7px 8px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = COLORS.surface}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {item.is_completed ? (
                                    <CheckCircle2 size={18} color={COLORS.cyan} />
                                  ) : (
                                    <Circle size={18} color={COLORS.muted} />
                                  )}
                                </motion.div>
                                <span style={{
                                  flex: 1,
                                  fontSize: 12,
                                  color: item.is_completed ? COLORS.muted : '#ccc',
                                  textDecoration: item.is_completed ? 'line-through' : 'none',
                                }}>
                                  {item.title || item.name || 'Untitled step'}
                                </span>
                              </motion.button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* Captions Panel */}
          <div style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 14,
          }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={14} color={COLORS.cyan} />
              Captions
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: COLORS.muted, display: 'block', marginBottom: 4 }}>
                  Facebook Caption
                  <span style={{ float: 'right' }}>{fbCaption.length} chars</span>
                </label>
                <textarea
                  value={fbCaption}
                  onChange={e => setFbCaption(e.target.value)}
                  onBlur={handleFbCaptionSave}
                  rows={6}
                  placeholder="Long-form, educational, 150-300 words"
                  style={{
                    ...inputBase,
                    resize: 'vertical',
                    minHeight: 100,
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: COLORS.muted, display: 'block', marginBottom: 4 }}>
                  Instagram Caption
                  <span style={{ float: 'right' }}>{igCaption.length} chars</span>
                </label>
                <textarea
                  value={igCaption}
                  onChange={e => setIgCaption(e.target.value)}
                  onBlur={handleIgCaptionSave}
                  rows={6}
                  placeholder="Short hook + save trigger + CTA"
                  style={{
                    ...inputBase,
                    resize: 'vertical',
                    minHeight: 100,
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Performance Panel */}
          {selectedPost.status === 'Posted' && (
            <div style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 14,
            }}>
              <h4 style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                margin: '0 0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <BarChart3 size={14} color={COLORS.cyan} />
                Performance
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.gold,
                  marginLeft: 'auto',
                  background: `${COLORS.gold}20`,
                  padding: '3px 10px',
                  borderRadius: 6,
                }}>
                  <TrendingUp size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {engagementRate}% eng.
                </span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[
                  { label: 'Reach', key: 'performance_reach', icon: Eye, value: reach, setter: setReach },
                  { label: 'Likes', key: 'performance_likes', icon: ThumbsUp, value: likes, setter: setLikes },
                  { label: 'Comments', key: 'performance_comments', icon: MessageCircle, value: comments, setter: setComments },
                  { label: 'Saves', key: 'performance_saves', icon: Bookmark, value: saves, setter: setSaves },
                  { label: 'Shares', key: 'performance_shares', icon: Share2, value: shares, setter: setShares },
                ].map(field => {
                  const Icon = field.icon
                  return (
                    <div key={field.key}>
                      <label style={{
                        fontSize: 10,
                        color: COLORS.muted,
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <Icon size={11} />
                        {field.label}
                      </label>
                      <input
                        type="number"
                        value={field.value}
                        onChange={e => field.setter(parseInt(e.target.value) || 0)}
                        onBlur={() => handlePerformanceBlur(field.key, field.value)}
                        min="0"
                        style={inputBase}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      color: '#fff',
      height: 'calc(100vh - 160px)',
      minHeight: 500,
    }}>
      {isMobile && (
        <div style={{
          display: 'flex',
          gap: 4,
          background: COLORS.surface,
          borderRadius: 8,
          padding: 3,
          marginBottom: 10,
        }}>
          <button
            onClick={() => setMobileView('list')}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: 6,
              border: 'none',
              background: mobileView === 'list' ? COLORS.cyan : 'transparent',
              color: mobileView === 'list' ? '#000' : COLORS.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ListFilter size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            List
          </button>
          <button
            onClick={() => setMobileView('detail')}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: 6,
              border: 'none',
              background: mobileView === 'detail' ? COLORS.cyan : 'transparent',
              color: mobileView === 'detail' ? '#000' : COLORS.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <CheckSquare size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Detail
          </button>
        </div>
      )}

      <div style={{
        display: 'flex',
        height: '100%',
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${COLORS.border}`,
      }}>
        {listView}
        {detailView}
      </div>
    </div>
  )
}

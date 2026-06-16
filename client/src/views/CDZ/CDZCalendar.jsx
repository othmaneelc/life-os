import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, parseISO, addDays,
} from 'date-fns';
import {
  Calendar, ChevronLeft, ChevronRight, Image, Video,
  Square, Bookmark, X, Plus, Save, List, Grid3X3, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  Idea: { color: '#666', label: 'Idea' },
  'In Production': { color: '#00C2FF', label: 'In Production' },
  'Ready for Review': { color: '#FFB800', label: 'Ready for Review' },
  Approved: { color: '#00FF87', label: 'Approved' },
  Posted: { color: '#C9A84C', label: 'Posted' },
};

const PLATFORMS = ['All', 'Facebook', 'Instagram', 'Both'];
const TYPES = ['All', 'Carousel', 'Reel', 'Single Image', 'Story'];
const STATUSES = Object.keys(STATUS_CONFIG);
const PILLARS = ['Education', 'Trust', 'Promotion', 'Engagement', 'Seasonal'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const POST_TYPES = ['Carousel', 'Reel', 'Single Image', 'Story'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TYPE_ICONS = {
  Carousel: Square,
  Reel: Video,
  'Single Image': Image,
  Story: Bookmark,
};

const INITIAL_FORM = {
  title: '',
  topic: '',
  content_pillar: 'Education',
  post_type: 'Carousel',
  platform: 'Facebook',
  status: 'Idea',
  priority: 'Normal',
  scheduled_date: '',
  design_notes: '',
};

export default function CDZCalendar({ posts = [], onTabChange }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [statusFilter, setStatusFilter] = useState([]);
  const [platformFilter, setPlatformFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const panelRef = useRef(null);

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (statusFilter.length) {
      result = result.filter((p) => statusFilter.includes(p.status));
    }
    if (platformFilter !== 'All') {
      result = result.filter((p) => p.platform === platformFilter);
    }
    if (typeFilter !== 'All') {
      result = result.filter((p) => p.post_type === typeFilter);
    }
    return result;
  }, [posts, statusFilter, platformFilter, typeFilter]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const res = await fetch('/api/cdz/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create post');
        return res.json();
      } catch (e) {
        throw e;
      }
    },
    onSuccess: () => {
      toast.success('Post created');
      queryClient.invalidateQueries({ queryKey: ['cdz-posts'] });
      setShowModal(false);
      setForm({ ...INITIAL_FORM });
    },
    onError: () => toast.error('Failed to create post'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const res = await fetch(`/api/cdz/posts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update post');
        return res.json();
      } catch (e) {
        throw e;
      }
    },
    onSuccess: () => {
      toast.success('Post updated');
      queryClient.invalidateQueries({ queryKey: ['cdz-posts'] });
      setSelectedPost(null);
    },
    onError: () => toast.error('Failed to update post'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const res = await fetch(`/api/cdz/posts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete post');
      } catch (e) {
        throw e;
      }
    },
    onSuccess: () => {
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['cdz-posts'] });
      setSelectedPost(null);
    },
    onError: () => toast.error('Failed to delete post'),
  });

  const toggleStatusFilter = (s) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleNewPost = (date) => {
    setForm({ ...INITIAL_FORM, scheduled_date: format(date, 'yyyy-MM-dd') });
    setShowModal(true);
  };

  const handleEditPost = (post) => {
    setSelectedPost(post);
    setForm({
      title: post.title || '',
      topic: post.topic || '',
      content_pillar: post.content_pillar || 'Education',
      post_type: post.post_type || 'Carousel',
      platform: post.platform || 'Facebook',
      status: post.status || 'Idea',
      priority: post.priority || 'Normal',
      scheduled_date: post.scheduled_date
        ? format(parseISO(post.scheduled_date), 'yyyy-MM-dd')
        : '',
      design_notes: post.design_notes || '',
    });
  };

  const handleSave = () => {
    if (selectedPost) {
      updateMutation.mutate({ id: selectedPost._id || selectedPost.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = () => {
    if (selectedPost) {
      deleteMutation.mutate(selectedPost._id || selectedPost.id);
    }
  };

  const postsByDate = useMemo(() => {
    const map = {};
    filteredPosts.forEach((p) => {
      if (p.scheduled_date) {
        const key = format(parseISO(p.scheduled_date), 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    });
    return map;
  }, [filteredPosts]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPost(null);
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (selectedPost && panelRef.current) {
      panelRef.current.focus();
    }
  }, [selectedPost]);

  const PostCard = ({ post, compact }) => {
    const statusColor = STATUS_CONFIG[post.status]?.color || '#666';
    const TypeIcon = TYPE_ICONS[post.post_type] || Square;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => handleEditPost(post)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 6px',
          marginBottom: 3,
          borderRadius: 4,
          background: '#111111',
          borderLeft: `2px solid ${statusColor}`,
          cursor: 'pointer',
          fontSize: 11,
          color: '#ccc',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <TypeIcon size={10} style={{ flexShrink: 0, color: statusColor }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {post.title?.length > 15 ? post.title.slice(0, 15) + '…' : post.title}
        </span>
        {!compact && (
          <span style={{ fontSize: 9, color: '#666', flexShrink: 0 }}>
            {post.platform}
          </span>
        )}
      </motion.div>
    );
  };

  const renderMonthView = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={navBtnStyle} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={navBtnStyle} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {DAYS_SHORT.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#666', padding: '6px 0', fontWeight: 600 }}>
            {d}
          </div>
        ))}
        {monthDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayPosts = postsByDate[key] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          return (
            <div
              key={key}
              onClick={() => !dayPosts.length && handleNewPost(day)}
              style={{
                minHeight: 90,
                padding: 4,
                background: isCurrentMonth ? '#0D0D0D' : '#090909',
                border: `1px solid #1A1A1A`,
                borderRadius: 4,
                opacity: isCurrentMonth ? 1 : 0.4,
                cursor: isCurrentMonth ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isToday(day) ? 700 : 400,
                    color: isToday(day) ? '#00C2FF' : '#999',
                    background: isToday(day) ? 'rgba(0,194,255,0.15)' : 'transparent',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div style={{ maxHeight: 80, overflowY: 'auto' }}>
                {dayPosts.slice(0, 3).map((post) => (
                  <PostCard key={post._id || post.id} post={post} compact />
                ))}
                {!dayPosts.length && isCurrentMonth && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, color: '#333' }}>
                    <Plus size={14} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} style={navBtnStyle} aria-label="Previous week">
          <ChevronLeft size={18} />
        </button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>
          {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
        </h3>
        <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} style={navBtnStyle} aria-label="Next week">
          <ChevronRight size={18} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {weekDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayPosts = postsByDate[key] || [];
          const isPostDay = format(day, 'E') === 'Mon' || format(day, 'E') === 'Thu';
          return (
            <div
              key={key}
              style={{
                minHeight: 200,
                padding: 8,
                background: isPostDay ? 'rgba(0,194,255,0.05)' : '#0D0D0D',
                border: `1px solid #1A1A1A`,
                borderRadius: 6,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{format(day, 'EEE')}</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: isToday(day) ? 700 : 400,
                    color: isToday(day) ? '#00C2FF' : '#ccc',
                    background: isToday(day) ? 'rgba(0,194,255,0.15)' : 'transparent',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  {format(day, 'd')}
                </div>
              </div>
              <div>
                {dayPosts.map((post) => (
                  <PostCard key={post._id || post.id} post={post} />
                ))}
                {isPostDay && !dayPosts.length && (
                  <div
                    onClick={() => handleNewPost(day)}
                    style={{
                      border: '1px dashed #333',
                      borderRadius: 4,
                      padding: '8px 4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      color: '#555',
                      fontSize: 11,
                    }}
                  >
                    <Plus size={14} style={{ margin: '0 auto' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFilters = () => (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Filter size={14} color="#666" />
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatusFilter(s)}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 11,
              border: `1px solid ${statusFilter.includes(s) ? STATUS_CONFIG[s].color : '#333'}`,
              background: statusFilter.includes(s) ? STATUS_CONFIG[s].color + '22' : 'transparent',
              color: statusFilter.includes(s) ? STATUS_CONFIG[s].color : '#999',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#666' }}>Platform:</span>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            style={{
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 10,
              border: `1px solid ${platformFilter === p ? '#00C2FF' : '#333'}`,
              background: platformFilter === p ? 'rgba(0,194,255,0.15)' : 'transparent',
              color: platformFilter === p ? '#00C2FF' : '#999',
              cursor: 'pointer',
            }}
          >
            {p}
          </button>
        ))}
        <span style={{ fontSize: 11, color: '#666', marginLeft: 8 }}>Type:</span>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 10,
              border: `1px solid ${typeFilter === t ? '#00C2FF' : '#333'}`,
              background: typeFilter === t ? 'rgba(0,194,255,0.15)' : 'transparent',
              color: typeFilter === t ? '#00C2FF' : '#999',
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
        {(statusFilter.length || platformFilter !== 'All' || typeFilter !== 'All') && (
          <button
            onClick={() => { setStatusFilter([]); setPlatformFilter('All'); setTypeFilter('All'); }}
            style={{
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 10,
              border: '1px solid #C9A84C',
              background: 'transparent',
              color: '#C9A84C',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  const renderForm = (editMode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label htmlFor="cdz-title" style={labelStyle}>Title</label>
          <input
            id="cdz-title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            style={inputStyle}
            placeholder="Post title"
          />
        </div>
        <div>
          <label htmlFor="cdz-topic" style={labelStyle}>Topic</label>
          <input
            id="cdz-topic"
            value={form.topic}
            onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
            style={inputStyle}
            placeholder="Topic / keyword"
          />
        </div>
        <div>
          <label htmlFor="cdz-content-pillar" style={labelStyle}>Content Pillar</label>
          <select id="cdz-content-pillar" value={form.content_pillar} onChange={(e) => setForm((p) => ({ ...p, content_pillar: e.target.value }))} style={inputStyle}>
            {PILLARS.map((ph) => <option key={ph} value={ph}>{ph}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cdz-post-type" style={labelStyle}>Post Type</label>
          <select id="cdz-post-type" value={form.post_type} onChange={(e) => setForm((p) => ({ ...p, post_type: e.target.value }))} style={inputStyle}>
            {POST_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cdz-platform" style={labelStyle}>Platform</label>
          <select id="cdz-platform" value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))} style={inputStyle}>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="Both">Both</option>
          </select>
        </div>
        <div>
          <label htmlFor="cdz-status" style={labelStyle}>Status</label>
          <select id="cdz-status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>
            {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cdz-priority" style={labelStyle}>Priority</label>
          <select id="cdz-priority" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} style={inputStyle}>
            {PRIORITIES.map((pr) => <option key={pr} value={pr}>{pr}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cdz-scheduled-date" style={labelStyle}>Scheduled Date</label>
          <input
            id="cdz-scheduled-date"
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label htmlFor="cdz-design-notes" style={labelStyle}>Design Notes</label>
        <textarea
          id="cdz-design-notes"
          value={form.design_notes}
          onChange={(e) => setForm((p) => ({ ...p, design_notes: e.target.value }))}
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          placeholder="Design notes, references, copy…"
        />
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, color: '#fff', fontFamily: 'system-ui, sans-serif', position: 'relative', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={20} color="#00C2FF" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Content Calendar</h2>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#111111', borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setView('month')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              border: 'none',
              background: view === 'month' ? '#00C2FF' : 'transparent',
              color: view === 'month' ? '#000' : '#999',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <Grid3X3 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Month
          </button>
          <button
            onClick={() => setView('week')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              border: 'none',
              background: view === 'week' ? '#00C2FF' : 'transparent',
              color: view === 'week' ? '#000' : '#999',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <List size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Week
          </button>
        </div>
      </div>

      {renderFilters()}
      {view === 'month' ? renderMonthView() : renderWeekView()}

      <button
        onClick={() => { setSelectedPost(null); setForm({ ...INITIAL_FORM }); setShowModal(true); }}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#00C2FF',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,194,255,0.3)',
          zIndex: 50,
        }}
      >
        <Plus size={24} color="#000" />
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              zIndex: 100,
            }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 600,
                background: '#111111',
                borderRadius: '16px 16px 0 0',
                padding: 24,
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>
                  {selectedPost ? 'Edit Post' : 'New Post'}
                </h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }} aria-label="Close modal">
                  <X size={20} />
                </button>
              </div>
              {renderForm(!!selectedPost)}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#00C2FF',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Save size={16} />
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #333',
                    background: 'transparent',
                    color: '#999',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              zIndex: 90,
            }}
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 480,
                maxWidth: '100vw',
                background: '#111111',
                borderLeft: '1px solid #1A1A1A',
                padding: 24,
                overflowY: 'auto',
                boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>Edit Post</h3>
                <button onClick={() => setSelectedPost(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }} aria-label="Close details">
                  <X size={20} />
                </button>
              </div>
              {renderForm(true)}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#00C2FF',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Save size={16} />
                  {updateMutation.isPending ? 'Saving…' : 'Update'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #ff4444',
                    background: 'transparent',
                    color: '#ff4444',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={() => setSelectedPost(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #333',
                    background: 'transparent',
                    color: '#999',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const navBtnStyle = {
  background: 'none',
  border: '1px solid #333',
  borderRadius: 6,
  color: '#999',
  cursor: 'pointer',
  padding: '6px 8px',
  display: 'flex',
  alignItems: 'center',
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  color: '#666',
  marginBottom: 4,
  fontWeight: 500,
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #1A1A1A',
  background: '#0D0D0D',
  color: '#fff',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

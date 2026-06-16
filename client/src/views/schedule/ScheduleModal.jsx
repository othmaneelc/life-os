import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Zap, MoreHorizontal, ChevronDown, ChevronUp, MapPin, AlignLeft, Repeat, Trash2 } from 'lucide-react'
import Modal from '../../components/Modal'
import { BLOCK_COLORS } from './constants'
import { formatDateStr, parseNaturalLanguage } from './utils'
import { useDeleteScheduleTemplate } from '../../store/scheduleStore'

export default function ScheduleModal({ block, open, onSave, onClose, selectedDate, syncToGoogle, onToggleSync, gcalConnected, templates }) {
  const [form, setForm] = useState(null)
  const [naturalInput, setNaturalInput] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [timeError, setTimeError] = useState('')
  const deleteTemplate = useDeleteScheduleTemplate()

  const defaultForm = {
    start_time: '09:00', end_time: '10:00', title: '', subtitle: '',
    block_type: 'Work', color: BLOCK_COLORS['Work'], day_of_week: 'all',
    date: selectedDate ? formatDateStr(selectedDate) : formatDateStr(new Date()),
    recurrence: '', recurrence_end_date: '', is_all_day: false,
  }

  useEffect(() => {
    setForm(block ? { ...block } : { ...defaultForm })
    setNaturalInput('')
    setShowAdvanced(false)
    setTimeError('')
  }, [block, open, selectedDate])

  useEffect(() => {
    if (!naturalInput || !form) return
    const parsed = parseNaturalLanguage(naturalInput)
    if (parsed) {
      setForm(prev => ({
        ...prev,
        title: parsed.title || prev.title,
        start_time: parsed.start_time || prev.start_time,
        end_time: parsed.end_time || prev.end_time,
        date: parsed.date || prev.date,
        block_type: parsed.block_type || prev.block_type,
        color: parsed.color || prev.color,
      }))
    }
  }, [naturalInput])

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'block_type') {
      setForm(prev => ({ ...prev, color: BLOCK_COLORS[value] || prev.color }))
    }
    setTimeError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form?.title.trim()) return
    if (!form.is_all_day && form.start_time >= form.end_time) {
      setTimeError('End time must be after start time')
      return
    }
    onSave(form)
  }

  function applyTemplate(t) {
    setForm(prev => ({
      ...prev,
      title: t.title,
      start_time: t.start_time,
      end_time: t.end_time,
      block_type: t.block_type,
      color: t.color,
    }))
    setShowTemplates(false)
  }

  if (!form) return null

  return (
    <Modal open={open} onClose={onClose} title={block ? 'Edit Event' : 'Add Event'} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        {!block && (
          <div className="relative">
            <label className="section-label block mb-1 flex items-center gap-1"><Sparkles size={12} /> Quick Add (natural language)</label>
            <div className="relative">
              <Zap size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-apple-muted" />
              <input type="text" value={naturalInput} onChange={e => setNaturalInput(e.target.value)}
                placeholder='e.g. "Team meeting at 3pm to 4pm tomorrow"'
                className="input-field pl-8 pr-3" />
            </div>
          </div>
        )}

        {!block && templates.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="section-label flex items-center gap-1 hover:text-apple-text transition-colors">
              <MoreHorizontal size={12} /> Templates {showTemplates ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {templates.map(t => (
                      <div key={t.id} className="flex items-center gap-1">
                        <button type="button" onClick={() => applyTemplate(t)}
                          className="flex-1 p-2 rounded-lg border text-left transition-colors"
                          style={{ border: '1px solid var(--border-color)', borderLeftColor: t.color, borderLeftWidth: '2px' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div className="text-small font-medium">{t.name}</div>
                          <div className="text-micro" style={{ color: 'var(--text-muted)' }}>{t.start_time} – {t.end_time}</div>
                        </button>
                        <button type="button" onClick={async () => {
                          try { await deleteTemplate.mutateAsync(t.id) } catch {}
                        }} aria-label="Delete template"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div>
          <label className="section-label block mb-1">Title</label>
          <input type="text" value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Event title" className="input-field" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label block mb-1 flex items-center gap-1"><MapPin size={12} /> Location</label>
            <input type="text" value={form.subtitle || ''} onChange={e => handleChange('subtitle', e.target.value)} placeholder="Location" className="input-field" />
          </div>
          <div>
            <label className="section-label block mb-1 flex items-center gap-1"><AlignLeft size={12} /> Description</label>
            <input type="text" value={form.description || ''} onChange={e => handleChange('description', e.target.value)} placeholder="Notes" className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="section-label block mb-1">Date</label>
            <input type="date" value={form.date || ''} onChange={e => handleChange('date', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="section-label block mb-1">Start</label>
            <input type="time" value={form.start_time} onChange={e => { handleChange('start_time', e.target.value); setTimeError('') }} className="input-field" disabled={form.is_all_day} />
          </div>
          <div>
            <label className="section-label block mb-1">End</label>
            <input type="time" value={form.end_time} onChange={e => { handleChange('end_time', e.target.value); setTimeError('') }} className="input-field" disabled={form.is_all_day} />
          </div>
        </div>

        {timeError && (
          <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{timeError}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label block mb-1">Type</label>
            <select value={form.block_type} onChange={e => handleChange('block_type', e.target.value)} className="input-field">
              {Object.keys(BLOCK_COLORS).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="section-label block mb-1">Color</label>
            <input type="color" value={form.color} onChange={e => handleChange('color', e.target.value)} className="w-full h-8 rounded-input cursor-pointer" />
          </div>
        </div>

        <div>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="section-label flex items-center gap-1 hover:text-apple-text transition-colors">
            <Repeat size={12} /> Advanced options {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3 mt-2">
                <label className="flex items-center gap-2 text-small cursor-pointer">
                  <input type="checkbox" checked={form.is_all_day} onChange={e => handleChange('is_all_day', e.target.checked)} className="rounded border-apple-border" />
                  <span style={{ color: 'var(--text-muted)' }}>All-day event</span>
                </label>
                <div>
                  <label className="section-label block mb-1">Repeat</label>
                  <select value={form.recurrence || ''} onChange={e => handleChange('recurrence', e.target.value)} className="input-field">
                    <option value="">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekends">Weekends</option>
                  </select>
                </div>
                {form.recurrence && (
                  <div>
                    <label className="section-label block mb-1">Repeat until</label>
                    <input type="date" value={form.recurrence_end_date || ''} onChange={e => handleChange('recurrence_end_date', e.target.value)} className="input-field" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {gcalConnected && (
          <label className="flex items-center gap-2 text-small cursor-pointer">
            <input type="checkbox" checked={syncToGoogle} onChange={onToggleSync} className="rounded border-apple-border" />
            <span style={{ color: 'var(--text-muted)' }}>Sync to Google Calendar</span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">{block ? 'Update' : 'Add'}</motion.button>
        </div>
      </form>
    </Modal>
  )
}

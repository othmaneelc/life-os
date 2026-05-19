import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import Modal from './Modal'
import { motion } from 'framer-motion'
import { useTaskStore } from '../store/taskStore'

export default function QuickAddModal({ open, onClose }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('business')
  const [tag, setTag] = useState('')
  const addTask = useTaskStore(s => s.addTask)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [open])

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    addTask({ title: title.trim(), category, tag: tag || undefined, priority: 'medium', status: 'todo' })
    onClose()
    setTitle('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Quick Add Task" maxWidth="lg" alignTop>
      <form onSubmit={handleSubmit}>
        <input ref={inputRef} type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What needs to be done?" className="input-field mb-3 text-subheading" />
        <div className="flex gap-2 mb-4">
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-field flex-1">
            <option value="urgent">Urgent</option>
            <option value="business">Business</option>
            <option value="personal">Personal</option>
          </select>
          <select value={tag} onChange={e => setTag(e.target.value)} className="input-field flex-1">
            <option value="">No tag</option>
            <option value="CDZ">CDZ</option>
            <option value="HVAC">HVAC</option>
            <option value="Agency">Agency</option>
            <option value="Brand">Brand</option>
            <option value="Self">Self</option>
            <option value="Faith">Faith</option>
          </select>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus size={16} /> Add Task
        </motion.button>
      </form>
    </Modal>
  )
}

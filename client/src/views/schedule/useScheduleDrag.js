import { useState, useCallback, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { timeToMin, minToTime } from './utils'
import { useUpdateScheduleBlock } from '../../store/scheduleStore'

export function useScheduleDrag() {
  const [dragging, setDragging] = useState(null)
  const [dragResize, setDragResize] = useState(null)
  const draggingRef = useRef(null)
  const updateBlock = useUpdateScheduleBlock()

  const handleDragStart = useCallback((event, block) => {
    if (block.is_google) return
    event.dataTransfer.setData('text/plain', JSON.stringify(block))
    event.dataTransfer.effectAllowed = 'move'
    draggingRef.current = block
    setDragging(block)
  }, [])

  const handleDragEnd = useCallback(() => {
    draggingRef.current = null
    setDragging(null)
  }, [])

  const handleDrop = useCallback(async (dateStr, hour) => {
    const block = draggingRef.current
    if (!block) return
    const newStart = `${String(hour).padStart(2, '0')}:${String(timeToMin(block.start_time) % 60).padStart(2, '0')}`
    const duration = timeToMin(block.end_time) - timeToMin(block.start_time)
    const newEnd = minToTime(timeToMin(newStart) + duration)
    await updateBlock.mutateAsync({ id: block.id, updates: { start_time: newStart, end_time: newEnd, date: dateStr } })
    draggingRef.current = null
    setDragging(null)
  }, [updateBlock])

  const handleResizeStart = useCallback((e, block) => {
    e.preventDefault()
    e.stopPropagation()
    if (block.is_google) return
    setDragResize({ block, startY: e.clientY, startEnd: timeToMin(block.end_time) })
  }, [])

  useEffect(() => {
    if (!dragResize) return
    function handleMove(e) {
      const delta = Math.round((e.clientY - dragResize.startY) / 60) * 60
      const newEnd = Math.max(dragResize.startEnd + delta, timeToMin(dragResize.block.start_time) + 15)
      setDragResize(prev => prev ? { ...prev, newEnd } : null)
    }
    async function handleUp() {
      if (dragResize?.newEnd && dragResize.newEnd !== dragResize.startEnd) {
        const newEndTime = minToTime(dragResize.newEnd)
        await updateBlock.mutateAsync({ id: dragResize.block.id, updates: { end_time: newEndTime } })
        toast.success('Event resized')
      }
      setDragResize(null)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragResize, updateBlock])

  return { dragging, dragResize, handleDragStart, handleDragEnd, handleDrop, handleResizeStart }
}

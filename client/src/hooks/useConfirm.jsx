import { useState, useCallback, useRef, useEffect } from 'react'
import ConfirmModal from '../components/ConfirmModal'

let confirmState = { open: false, message: '', title: '', confirmText: 'Delete', variant: 'danger' }
let confirmResolve = null
let confirmListeners = new Set()

function notifyConfirm() { confirmListeners.forEach(l => l()) }

export function ConfirmModalPortal() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1)
    confirmListeners.add(fn)
    return () => confirmListeners.delete(fn)
  }, [])
  const handleConfirm = () => { confirmResolve?.(true); confirmResolve = null; confirmState = { ...confirmState, open: false }; notifyConfirm() }
  const handleCancel = () => { confirmResolve?.(false); confirmResolve = null; confirmState = { ...confirmState, open: false }; notifyConfirm() }
  return (
    <ConfirmModal
      message={confirmState.message}
      title={confirmState.title}
      confirmText={confirmState.confirmText}
      variant={confirmState.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      isOpen={confirmState.open}
    />
  )
}

export function useConfirm() {
  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      confirmResolve = resolve
      confirmState = { open: true, message, title: options.title || 'Confirm', confirmText: options.confirmText || 'Delete', variant: options.variant || 'danger' }
      notifyConfirm()
    })
  }, [])
  return { confirm, ConfirmModal: ConfirmModalPortal }
}

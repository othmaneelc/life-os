import ConfirmDialog from './ConfirmDialog'

export default function ConfirmModal({ message, title, confirmText, variant, onConfirm, onCancel, isOpen }) {
  return (
    <ConfirmDialog
      open={isOpen}
      title={title}
      message={message}
      confirmText={confirmText}
      variant={variant}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

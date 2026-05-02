interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel, danger = true }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-surface-1 border border-border rounded-lg w-96 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base text-white font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted mb-5 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted hover:text-white hover:bg-surface-3 rounded transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm text-white rounded transition-colors ${
              danger ? 'bg-error hover:bg-red-600' : 'bg-accent hover:bg-accent-dim'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

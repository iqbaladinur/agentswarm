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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="animate-fade-in-up w-[400px] bg-surface-2 border border-border rounded-xl p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] text-text-primary font-semibold mb-1.5">{title}</h2>
        <p className="text-[13px] text-text-secondary leading-relaxed mb-6">{message}</p>
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="h-9 px-4 text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-lg transition-all duration-100 font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`h-9 px-5 text-[13px] text-white rounded-lg transition-all duration-100 font-medium ${
              danger
                ? 'bg-error hover:bg-red-500/90 shadow-[0_4px_12px_rgba(248,113,113,0.2)]'
                : 'bg-accent hover:bg-accent-dim shadow-[0_4px_12px_rgba(139,124,247,0.2)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

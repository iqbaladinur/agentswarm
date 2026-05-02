interface Props {
  title: string
  message: string
  onClose: () => void
}

export function AlertDialog({ title, message, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-4" onClick={onClose}>
      <div
        className="bg-surface-1 border border-border rounded-lg w-96 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base text-white font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted mb-5 leading-relaxed">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent-dim rounded transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

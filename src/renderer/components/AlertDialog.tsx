interface Props {
  title: string
  message: string
  onClose: () => void
}

export function AlertDialog({ title, message, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="animate-fade-in-up w-[400px] bg-surface-2 border border-border rounded-xl p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] text-text-primary font-semibold mb-1.5">{title}</h2>
        <p className="text-[13px] text-text-secondary leading-relaxed mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-5 text-[13px] text-white bg-accent hover:bg-accent-dim rounded-lg transition-all duration-100 font-medium shadow-btn-accent"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

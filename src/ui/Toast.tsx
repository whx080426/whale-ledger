interface Props {
  message: string
  undo?: () => void
  onClose: () => void
}

export default function Toast({ message, undo, onClose }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[96px] z-50 flex justify-center px-6">
      <div className="animate-pop pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-ink/92 px-4 py-2.5 text-white shadow-xl backdrop-blur">
        <span className="truncate text-[13px]">{message}</span>
        {undo && (
          <button
            onClick={() => {
              undo()
              onClose()
            }}
            className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium"
          >
            撤销
          </button>
        )}
      </div>
    </div>
  )
}

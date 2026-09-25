import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
  action?: { label: string; onClick: () => void }
}
interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmText?: string
  danger?: boolean
}

interface FeedbackValue {
  toast: (message: string, kind?: ToastKind, action?: Toast['action']) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const Ctx = createContext<FeedbackValue | null>(null)

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  error: <XCircle className="h-5 w-5 text-red-600" />,
  info: <Info className="h-5 w-5 text-primary-600" />,
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const seq = useRef(0)

  const toast = useCallback<FeedbackValue['toast']>((message, kind = 'success', action) => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-3), { id, kind, message, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 3600)
  }, [])

  const confirm = useCallback<FeedbackValue['confirm']>(
    (opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  )

  const close = (v: boolean) => {
    confirmState?.resolve(v)
    setConfirmState(null)
  }

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-[var(--shadow-lift)] backdrop-blur"
            >
              {icons[t.kind]}
              <span className="flex-1 text-sm font-medium">{t.message}</span>
              {t.action && (
                <button
                  className="cursor-pointer rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-100"
                  onClick={() => {
                    t.action!.onClick()
                    setToasts((x) => x.filter((y) => y.id !== t.id))
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Modal
        open={!!confirmState}
        onClose={() => close(false)}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>إلغاء</Button>
            <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {confirmState?.confirmText ?? 'تأكيد'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className={`grid h-14 w-14 place-items-center rounded-full ${confirmState?.danger ? 'bg-red-50 text-red-600' : 'bg-gold-50 text-gold-500'}`}>
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold">{confirmState?.title}</h3>
          {confirmState?.message && <div className="text-muted">{confirmState.message}</div>}
        </div>
      </Modal>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFeedback() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useFeedback must be used inside FeedbackProvider')
  return v
}

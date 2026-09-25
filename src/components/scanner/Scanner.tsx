import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { CameraOff, RefreshCw, SwitchCamera } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/format'

interface ScannerProps {
  onScan: (text: string) => void
  paused?: boolean
  className?: string
  /** أقل مدة بالملّي ثانية قبل قبول نفس الرمز مرة أخرى */
  repeatDelay?: number
}

export function Scanner({ onScan, paused = false, className, repeatDelay = 3000 }: ScannerProps) {
  const id = useId().replace(/:/g, '')
  const elId = `qr-${id}`
  const scanner = useRef<Html5Qrcode | null>(null)
  const last = useRef<{ text: string; at: number }>({ text: '', at: 0 })
  const onScanRef = useRef(onScan)
  const pausedRef = useRef(paused)
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [attempt, setAttempt] = useState(0)
  const [ready, setReady] = useState(false)

  onScanRef.current = onScan
  pausedRef.current = paused

  useEffect(() => {
    let cancelled = false
    const qr = new Html5Qrcode(elId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false, useBarCodeDetectorIfSupported: true })
    scanner.current = qr
    setError(null)
    setReady(false)
    qr.start(
      { facingMode: facing },
      {
        fps: 15,
        qrbox: (w, h) => {
          const s = Math.floor(Math.min(w, h) * 0.72)
          return { width: s, height: s }
        },
        aspectRatio: 1,
      },
      (text) => {
        if (pausedRef.current) return
        const now = Date.now()
        if (text === last.current.text && now - last.current.at < repeatDelay) return
        last.current = { text, at: now }
        onScanRef.current(text.trim())
      },
      () => {},
    )
      .then(() => {
        if (cancelled) void qr.stop().catch(() => {})
        else setReady(true)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = String(e)
        setError(
          /NotAllowed|Permission/i.test(msg)
            ? 'لم يتم السماح باستخدام الكاميرا. فعّل الإذن من إعدادات المتصفح ثم أعد المحاولة.'
            : /NotFound|no camera/i.test(msg)
              ? 'لم يتم العثور على كاميرا في هذا الجهاز.'
              : 'تعذر تشغيل الكاميرا. تأكد أن الموقع يعمل عبر HTTPS.',
        )
      })
    return () => {
      cancelled = true
      if (qr.isScanning) void qr.stop().then(() => qr.clear()).catch(() => {})
    }
  }, [elId, facing, attempt, repeatDelay])

  return (
    <div className={cn('relative overflow-hidden rounded-3xl bg-primary-900', className)}>
      <div id={elId} className="aspect-square w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
      {/* إطار التوجيه */}
      {ready && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="relative aspect-square w-[72%]">
            {['top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl', 'top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl'].map((c) => (
              <span key={c} className={cn('absolute h-12 w-12 border-gold-300', c)} />
            ))}
            <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse bg-gradient-to-l from-transparent via-gold-300 to-transparent" />
          </div>
        </div>
      )}
      {!ready && !error && (
        <div className="absolute inset-0 grid place-items-center text-gold-100">
          <span className="animate-pulse">جاري تشغيل الكاميرا…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
          <CameraOff className="h-12 w-12 text-gold-300" />
          <p className="max-w-xs text-sm leading-relaxed text-white/85">{error}</p>
          <Button variant="gold" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => setAttempt((a) => a + 1)}>
            إعادة المحاولة
          </Button>
        </div>
      )}
      {ready && (
        <button
          type="button"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          className="absolute bottom-3 left-3 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          aria-label="تبديل الكاميرا"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

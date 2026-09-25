import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Crop, ZoomIn } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { cropAndCompress } from '../../lib/image'

interface Props {
  src: string | null
  aspect?: number
  onCancel: () => void
  onDone: (file: File) => void
}

/** قص الصورة بالأبعاد المناسبة للعرض ثم ضغطها */
export function ImageCropper({ src, aspect = 16 / 9, onCancel, onDone }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const onComplete = useCallback((_: Area, px: Area) => setArea(px), [])

  const done = async () => {
    if (!src || !area) return
    setBusy(true)
    try {
      onDone(await cropAndCompress(src, area))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!src} onClose={onCancel} title="قص الصورة" subtitle="حرّك الصورة وكبّرها لتناسب مساحة العرض في الواجهة" size="lg"
      footer={<><Button variant="outline" onClick={onCancel}>إلغاء</Button><Button loading={busy} icon={<Crop className="h-4 w-4" />} onClick={() => void done()}>اعتماد القص</Button></>}>
      {src && (
        <>
          <div className="relative h-72 overflow-hidden rounded-2xl bg-primary-900 sm:h-96" dir="ltr">
            <Cropper image={src} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} showGrid />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ZoomIn className="h-5 w-5 text-muted" />
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--color-primary-600)]" />
          </div>
        </>
      )}
    </Modal>
  )
}

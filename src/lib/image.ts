import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** يقص الصورة حسب المنطقة المختارة ثم يضغطها إلى WebP */
export async function cropAndCompress(src: string, crop: PixelCrop, maxWidth = 1600): Promise<File> {
  const img = await loadImage(src)
  const scale = Math.min(1, maxWidth / crop.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(crop.width * scale)
  canvas.height = Math.round(crop.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/webp', 0.86))
  const file = new File([blob], 'image.webp', { type: 'image/webp' })
  if (file.size <= 350 * 1024) return file
  return imageCompression(file, {
    maxSizeMB: 0.35,
    maxWidthOrHeight: maxWidth,
    fileType: 'image/webp',
    useWebWorker: true,
    initialQuality: 0.8,
  })
}

export async function uploadImage(file: File, folder = 'posts'): Promise<string> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
  const { error } = await supabase.storage.from('media').upload(path, file, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw new Error(error.message)
  return path
}

export async function removeImage(path: string | null | undefined) {
  if (path) await supabase.storage.from('media').remove([path])
}

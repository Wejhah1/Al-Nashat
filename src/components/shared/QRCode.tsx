import { useEffect, useState } from 'react'
import QR from 'qrcode'

interface Props {
  value: string
  size?: number | string
  color?: string
  className?: string
}

/** رمز QR بصيغة SVG — يحافظ على الحدة عند الطباعة */
export function QRCode({ value, size = 120, color = '#0B3B2D', className }: Props) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    QR.toString(value, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: color, light: '#ffffff00' } })
      .then((s) => alive && setSvg(s))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [value, color])
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg width="100%" height="100%" shape-rendering="crispEdges" ') }}
    />
  )
}

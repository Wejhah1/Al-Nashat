import { QRCode } from './QRCode'

const CORNER = (
  <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
    <path d="M2 2h14M2 2v14" stroke="#C9A24B" strokeWidth="1.6" />
    <g transform="translate(13 13)" stroke="#0F4C3A" strokeWidth="1">
      <rect x="-5" y="-5" width="10" height="10" />
      <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" />
    </g>
    <circle cx="13" cy="13" r="1.6" fill="#C9A24B" />
  </svg>
)

/** بطاقة العضوية الرسمية: الاسم + QR + رقم العضوية فقط (90×64 مم) */
export function MemberIdCard({ name, code, memberNo }: { name: string; code: string; memberNo: number }) {
  const long = name.length > 22
  return (
    <div
      className="relative overflow-hidden bg-white text-ink"
      style={{ width: '90mm', height: '64mm', borderRadius: '4mm', border: '0.35mm solid #0F4C3A', breakInside: 'avoid', pageBreakInside: 'avoid' }}
    >
      {/* نقش خلفي خفيف */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%230F4C3A' stroke-opacity='0.07' stroke-width='1.4'%3E%3Crect x='28' y='28' width='40' height='40'/%3E%3Crect x='28' y='28' width='40' height='40' transform='rotate(45 48 48)'/%3E%3Ccircle cx='48' cy='48' r='9'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundColor: '#FDFBF6',
        }}
      />
      {/* إطار ذهبي داخلي */}
      <div className="absolute" style={{ inset: '2mm', border: '0.25mm solid #C9A24B', borderRadius: '2.6mm' }} />
      {/* زخارف الأركان */}
      <span className="absolute" style={{ top: '1.2mm', right: '1.2mm', width: '9mm', height: '9mm', transform: 'scaleX(-1)' }}>{CORNER}</span>
      <span className="absolute" style={{ top: '1.2mm', left: '1.2mm', width: '9mm', height: '9mm' }}>{CORNER}</span>
      <span className="absolute" style={{ bottom: '1.2mm', right: '1.2mm', width: '9mm', height: '9mm', transform: 'scale(-1)' }}>{CORNER}</span>
      <span className="absolute" style={{ bottom: '1.2mm', left: '1.2mm', width: '9mm', height: '9mm', transform: 'scaleY(-1)' }}>{CORNER}</span>

      <div className="relative flex h-full items-center" style={{ padding: '6mm 7mm', gap: '5mm' }}>
        {/* الاسم */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <div
            className="font-bold leading-snug text-primary-800"
            style={{ fontSize: long ? '4.2mm' : '5.2mm', wordBreak: 'break-word' }}
          >
            {name}
          </div>
          <div className="mt-[3mm] flex w-full items-center justify-center gap-[1.5mm]">
            <span style={{ height: '0.3mm', width: '10mm', background: 'linear-gradient(90deg, transparent, #C9A24B)' }} />
            <span style={{ width: '1.8mm', height: '1.8mm', transform: 'rotate(45deg)', background: '#C9A24B' }} />
            <span style={{ height: '0.3mm', width: '10mm', background: 'linear-gradient(270deg, transparent, #C9A24B)' }} />
          </div>
        </div>
        {/* QR + الرقم */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="bg-white" style={{ padding: '1.6mm', borderRadius: '2mm', border: '0.25mm solid #E6DCC6' }}>
            <QRCode value={code} size="32mm" color="#0B3B2D" />
          </div>
          <div className="tabular mt-[1.8mm] font-semibold text-primary-800" style={{ fontSize: '3.6mm', letterSpacing: '0.6mm' }} dir="ltr">
            {memberNo}
          </div>
        </div>
      </div>
    </div>
  )
}

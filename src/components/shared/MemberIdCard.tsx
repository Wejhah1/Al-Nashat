import { QRCode } from './QRCode'

/** نجمة ثمانية متداخلة — زخرفة هندسية إسلامية */
function Rosette({ className, style, stroke = '#D9B45A' }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} style={style} fill="none" stroke={stroke}>
      {[0, 22.5].map((r) => (
        <g key={r} transform={`rotate(${r})`} strokeWidth="0.6">
          <rect x="-32" y="-32" width="64" height="64" />
          <rect x="-32" y="-32" width="64" height="64" transform="rotate(45)" />
        </g>
      ))}
      <circle r="45" strokeWidth="0.5" />
      <circle r="18" strokeWidth="0.6" />
      <g strokeWidth="0.5">
        <rect x="-12" y="-12" width="24" height="24" />
        <rect x="-12" y="-12" width="24" height="24" transform="rotate(45)" />
      </g>
    </svg>
  )
}

function Corner({ style }: { style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 20 20" className="absolute" style={{ width: '6mm', height: '6mm', ...style }} fill="none" stroke="#D9B45A" strokeWidth="0.9">
      <path d="M1 12V1h11" />
      <path d="M4 8V4h4" />
      <rect x="0" y="0" width="3" height="3" fill="#D9B45A" stroke="none" transform="translate(6.5 6.5) rotate(45)" />
    </svg>
  )
}

/** بطاقة العضوية الرسمية (90×64 مم): النشاط الثقافي 1448 هـ + الاسم + QR + رقم العضوية */
export function MemberIdCard({ name, code, memberNo }: { name: string; code: string; memberNo: number }) {
  const long = name.length > 20
  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        width: '90mm',
        height: '64mm',
        borderRadius: '3.5mm',
        background: 'radial-gradient(120% 90% at 85% 0%, #1B6B52 0%, #0F4C3A 45%, #072820 100%)',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* نقش هندسي خلفي */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.5,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%23D9B45A' stroke-opacity='0.16' stroke-width='1.3'%3E%3Crect x='28' y='28' width='40' height='40'/%3E%3Crect x='28' y='28' width='40' height='40' transform='rotate(45 48 48)'/%3E%3Cpath d='M0 0L20 20M96 0L76 20M0 96L20 76M96 96L76 76M48 0V19.7M48 96V76.3M0 48H19.7M96 48H76.3'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      {/* وردة كبيرة */}
      <Rosette className="absolute" style={{ width: '74mm', height: '74mm', right: '-26mm', bottom: '-30mm', opacity: 0.13 }} />
      {/* توهج ذهبي */}
      <div className="absolute" style={{ width: '50mm', height: '50mm', right: '-10mm', top: '-22mm', borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,180,90,0.28), transparent 70%)' }} />

      {/* إطار ذهبي */}
      <div className="absolute" style={{ inset: '2.2mm', border: '0.22mm solid rgba(217,180,90,0.75)', borderRadius: '2.4mm' }} />
      <Corner style={{ top: '3.2mm', right: '3.2mm', transform: 'scaleX(-1)' }} />
      <Corner style={{ top: '3.2mm', left: '3.2mm' }} />
      <Corner style={{ bottom: '3.2mm', right: '3.2mm', transform: 'scale(-1)' }} />
      <Corner style={{ bottom: '3.2mm', left: '3.2mm', transform: 'scaleY(-1)' }} />

      <div className="relative flex h-full items-stretch" style={{ padding: '6mm 7mm 6mm 6mm', gap: '4mm' }}>
        {/* الهوية + الاسم */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div
              className="whitespace-nowrap font-display font-bold"
              style={{
                fontSize: '6.2mm',
                lineHeight: 1.25,
                color: '#E8C878',
                textShadow: '0 0.3mm 0 rgba(0,0,0,0.25), 0 0 3mm rgba(217,180,90,0.35)',
              }}
            >
              النشاط الثقافي
            </div>
            <div className="flex items-center" style={{ gap: '1.6mm', marginTop: '0.8mm' }}>
              <span style={{ fontSize: '2.7mm', letterSpacing: '0.9mm', color: '#E9D397', fontWeight: 500 }}>1448 هـ</span>
              <span style={{ height: '0.2mm', flex: 1, maxWidth: '16mm', background: 'linear-gradient(270deg, rgba(217,180,90,0.9), transparent)' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.3mm', color: 'rgba(233,211,151,0.8)', letterSpacing: '0.4mm', marginBottom: '1mm' }}>بطاقة عضوية</div>
            <div className="font-bold" style={{ fontSize: long ? '4.3mm' : '5.2mm', lineHeight: 1.35, wordBreak: 'break-word', textShadow: '0 0.3mm 1mm rgba(0,0,0,0.25)' }}>
              {name}
            </div>
            <div className="flex items-center" style={{ gap: '1.2mm', marginTop: '2mm' }}>
              <span style={{ width: '1.6mm', height: '1.6mm', transform: 'rotate(45deg)', background: '#D9B45A' }} />
              <span style={{ height: '0.25mm', width: '22mm', background: 'linear-gradient(270deg, #D9B45A, transparent)' }} />
            </div>
          </div>
        </div>

        {/* QR */}
        <div className="flex shrink-0 flex-col items-center justify-center bg-white"
          style={{ borderRadius: '2.6mm', padding: '2.4mm 2.4mm 1.6mm', boxShadow: '0 0 0 0.35mm #D9B45A, 0 1.5mm 4mm rgba(0,0,0,0.35)' }}>
          <QRCode value={code} size="27mm" color="#072820" />
          <div className="tabular font-bold" style={{ marginTop: '1.4mm', fontSize: '3.4mm', letterSpacing: '0.8mm', color: '#0F4C3A' }} dir="ltr">
            {memberNo}
          </div>
        </div>
      </div>
    </div>
  )
}

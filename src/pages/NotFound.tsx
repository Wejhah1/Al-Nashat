import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-primary-50 text-primary-600"><Compass className="h-10 w-10" /></div>
      <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 text-muted">ربما تم نقلها أو أن الرابط غير صحيح</p>
      <Link to="/" className="mt-6 rounded-xl bg-primary-700 px-6 py-3 font-medium text-white hover:bg-primary-600">العودة للرئيسية</Link>
    </div>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// بعد نشر نسخة جديدة قد تُطلب ملفات قديمة لم تعد موجودة: نعيد التحميل مرة واحدة
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  if (!sessionStorage.getItem('chunk-reload')) {
    sessionStorage.setItem('chunk-reload', '1')
    window.location.reload()
  }
})
// نجاح التحميل يعيد تفعيل الحماية للنشر القادم
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('chunk-reload'), 5000))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

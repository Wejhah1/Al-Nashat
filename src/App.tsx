import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { FeedbackProvider } from './components/ui/Feedback'
import { PublicLayout } from './components/layout/PublicLayout'
import { AdminLayout, OwnerOnly } from './components/layout/AdminLayout'
import { PageLoader } from './components/ui/misc'
import Home from './pages/Home'

const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Display = lazy(() => import('./pages/Display'))
const PublicLog = lazy(() => import('./pages/PublicLog'))
const Rules = lazy(() => import('./pages/Rules'))
const News = lazy(() => import('./pages/News'))
const NewsDetail = lazy(() => import('./pages/NewsDetail'))
const Portal = lazy(() => import('./pages/Portal'))
const Login = lazy(() => import('./pages/admin/Login'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Attendance = lazy(() => import('./pages/admin/Attendance'))
const Scan = lazy(() => import('./pages/admin/Scan'))
const Logs = lazy(() => import('./pages/admin/Logs'))
const Members = lazy(() => import('./pages/admin/Members'))
const Groups = lazy(() => import('./pages/admin/Groups'))
const RulesAdmin = lazy(() => import('./pages/admin/RulesAdmin'))
const BadgesAdmin = lazy(() => import('./pages/admin/BadgesAdmin'))
const Content = lazy(() => import('./pages/admin/Content'))
const Cards = lazy(() => import('./pages/admin/Cards'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const Seasons = lazy(() => import('./pages/admin/Seasons'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

const PREFETCH = [
  () => import('./pages/Leaderboard'),
  () => import('./pages/Display'),
  () => import('./pages/PublicLog'),
  () => import('./pages/Rules'),
  () => import('./pages/News'),
  () => import('./pages/NewsDetail'),
  () => import('./pages/Portal'),
  () => import('./pages/admin/Login'),
  () => import('./pages/admin/Dashboard'),
  () => import('./pages/admin/Attendance'),
  () => import('./pages/admin/Scan'),
  () => import('./pages/admin/Logs'),
  () => import('./pages/admin/Members'),
  () => import('./pages/admin/Groups'),
  () => import('./pages/admin/RulesAdmin'),
  () => import('./pages/admin/BadgesAdmin'),
  () => import('./pages/admin/Content'),
  () => import('./pages/admin/Cards'),
  () => import('./pages/admin/Reports'),
  () => import('./pages/admin/Seasons'),
  () => import('./pages/admin/SettingsPage'),
  () => import('./pages/NotFound'),
]

/** تحميل كل الصفحات مسبقاً في وقت الفراغ ليصبح التنقل فورياً */
function usePrefetch() {
  useEffect(() => {
    const run = () => PREFETCH.forEach((f) => void f().catch(() => {}))
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => void }
    const t = setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(run) : run()), 1200)
    return () => clearTimeout(t)
  }, [])
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

export default function App() {
  usePrefetch()
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <FeedbackProvider>
            <ScrollToTop />
            <Suspense fallback={<div className="islamic-pattern min-h-dvh"><PageLoader /></div>}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="leaderboard" element={<Leaderboard />} />
                  <Route path="log" element={<PublicLog />} />
                  <Route path="rules" element={<Rules />} />
                  <Route path="news" element={<News />} />
                  <Route path="news/:id" element={<NewsDetail />} />
                  <Route path="me" element={<Portal />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="display" element={<Display />} />
                <Route path="admin/login" element={<Login />} />
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="scan" element={<Scan />} />
                  <Route path="logs" element={<Logs />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="members" element={<OwnerOnly><Members /></OwnerOnly>} />
                  <Route path="seasons" element={<OwnerOnly><Seasons /></OwnerOnly>} />
                  <Route path="groups" element={<OwnerOnly><Groups /></OwnerOnly>} />
                  <Route path="rules" element={<OwnerOnly><RulesAdmin /></OwnerOnly>} />
                  <Route path="badges" element={<OwnerOnly><BadgesAdmin /></OwnerOnly>} />
                  <Route path="content" element={<OwnerOnly><Content /></OwnerOnly>} />
                  <Route path="cards" element={<OwnerOnly><Cards /></OwnerOnly>} />
                  <Route path="settings" element={<OwnerOnly><SettingsPage /></OwnerOnly>} />
                </Route>
              </Routes>
            </Suspense>
          </FeedbackProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

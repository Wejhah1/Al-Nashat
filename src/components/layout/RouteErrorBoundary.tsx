import { Component, type ReactNode } from 'react'

export class RouteErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-semibold">حدث خطأ أثناء تحميل الصفحة</p>
        <button onClick={() => window.location.reload()} className="rounded-xl bg-primary-700 px-5 py-2.5 text-sm font-medium text-white">إعادة المحاولة</button>
      </div>
    )
  }
}

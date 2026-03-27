import { Bell, Menu, Settings2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const NAV_SETTINGS_KEY = 'sukoon_nav_settings'

const defaultSettings = {
  showStatus: true,
  showQuickAction: true,
  compactLabels: false,
  sticky: true,
  glass: true,
  showAlertBadge: true,
}

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Check-in', path: '/input' },
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Coping', path: '/coping' },
  { label: 'History', path: '/history' },
]

function resolveStatusFromStorage() {
  try {
    const latest = JSON.parse(sessionStorage.getItem('sukoon_latest_analysis') || 'null')
    const stressIndex = Number(latest?.stress_index ?? 0)
    const burnout = latest?.burnout_status || ''

    if (burnout === 'Critical' || stressIndex > 70) {
      return { text: 'High', tone: 'bg-rose-100 text-rose-700 border-rose-200', isAlert: true }
    }
    if (burnout === 'Moderate' || stressIndex > 30) {
      return { text: 'Elevated', tone: 'bg-amber-100 text-amber-700 border-amber-200', isAlert: false }
    }

    return { text: 'Low', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', isAlert: false }
  } catch {
    return { text: 'Low', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', isAlert: false }
  }
}

function Navbar() {
  const location = useLocation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [settings, setSettings] = useState(defaultSettings)

  const currentStatus = useMemo(() => resolveStatusFromStorage(), [location.pathname])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(NAV_SETTINGS_KEY) || 'null')
      if (saved && typeof saved === 'object') {
        setSettings({ ...defaultSettings, ...saved })
      }
    } catch {
      setSettings(defaultSettings)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(NAV_SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    setIsMobileOpen(false)
    setShowCustomizer(false)
  }, [location.pathname])

  const navShellClass = settings.sticky
    ? 'sticky top-0 z-50'
    : 'relative z-50'

  const navSurfaceClass = settings.glass
    ? 'border-sky-200/55 bg-white/78 backdrop-blur-lg'
    : 'border-sky-200 bg-white'

  const linkBase = 'rounded-xl px-3 py-2 text-sm font-medium transition'
  const linkActive = 'bg-sky-100 text-sky-800'
  const linkIdle = 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'

  const brandTitle = settings.compactLabels ? 'Sukoon' : 'Sukoon Clinical'

  const updateSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <header className={navShellClass}>
      <nav className={`mx-auto mt-3 w-[min(1200px,calc(100%-1.5rem))] rounded-2xl border px-3 py-2 shadow-[0_10px_35px_rgba(2,132,199,0.12)] ${navSurfaceClass}`}>
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-700 text-sm font-semibold text-white">S</span>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700/85">Wellbeing AI</p>
              <p className="text-base font-semibold text-slate-900">{brandTitle}</p>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
                end={item.path === '/'}
              >
                {settings.compactLabels ? item.label.slice(0, 3) : item.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {settings.showStatus && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${currentStatus.tone}`}>
                {settings.showAlertBadge && currentStatus.isAlert && <Bell size={13} />}
                {currentStatus.text}
              </span>
            )}

            {settings.showQuickAction && (
              <Link
                to="/input"
                className="inline-flex items-center rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                New Analysis
              </Link>
            )}

            <button
              type="button"
              onClick={() => setShowCustomizer((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100"
              aria-label="Toggle navbar settings"
            >
              <Settings2 size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {showCustomizer && (
          <div className="mt-3 hidden rounded-xl border border-slate-200 bg-white p-3 md:block">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Navbar Toggles</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['showStatus', 'Show Status Chip'],
                ['showQuickAction', 'Show Quick Action'],
                ['compactLabels', 'Compact Labels'],
                ['sticky', 'Sticky Navbar'],
                ['glass', 'Glass Background'],
                ['showAlertBadge', 'Alert Badge'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateSetting(key)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${settings[key] ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isMobileOpen && (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 md:hidden">
            <div className="grid gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
                  end={item.path === '/'}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            {settings.showStatus && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${currentStatus.tone}`}>
                {settings.showAlertBadge && currentStatus.isAlert && <Bell size={13} />}
                Status: {currentStatus.text}
              </span>
            )}

            {settings.showQuickAction && (
              <Link
                to="/input"
                className="inline-flex w-full items-center justify-center rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                Start New Analysis
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar
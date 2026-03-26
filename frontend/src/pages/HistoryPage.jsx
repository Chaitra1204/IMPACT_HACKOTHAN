import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

function getTrendIcon(current, previous) {
  if (previous == null) {
    return { icon: Minus, label: 'Baseline', tone: 'text-[#64748B]' }
  }
  if (current < previous) {
    return { icon: ArrowDownRight, label: 'Trending Down', tone: 'text-[#10B981]' }
  }
  if (current > previous) {
    return { icon: ArrowUpRight, label: 'Trending Up', tone: 'text-[#EF4444]' }
  }
  return { icon: Minus, label: 'Stable', tone: 'text-[#64748B]' }
}

function HistoryPage() {
  const [history, setHistory] = useState([])

  const chartData = useMemo(() => {
    return [...history]
      .slice(0, 30)
      .reverse()
      .map((entry) => ({
        day: new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        stress: Number(entry.stress_index || 0),
      }))
  }, [history])

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('sukoon_history') || '[]')
    const sorted = cached.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    setHistory(sorted)
  }, [])

  const clearHistory = () => {
    localStorage.removeItem('sukoon_history')
    setHistory([])
    toast.success('History cleared for privacy.')
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#F8FAFC] px-6 py-10 text-[#1E293B]"
    >
      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-[#0369A1]/20 bg-white p-8 shadow-[0_20px_40px_rgba(3,105,161,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Recovery Timeline</h1>
            <p className="mt-2 text-[#1E293B]/75">Track stress index sessions and identify recovery or burnout drift.</p>
          </div>
          <button
            type="button"
            onClick={clearHistory}
            className="rounded-xl border border-[#EF4444]/45 bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2]"
          >
            Clear History
          </button>
        </div>

        {history.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#0369A1]/30 bg-[#F8FAFC] p-6">
            <p className="text-sm text-[#1E293B]/70">No check-in history yet. Complete one analysis to start timeline tracking.</p>
          </div>
        ) : (
          <>
            <div className="mt-7 rounded-2xl border border-[#0369A1]/20 bg-[#F8FAFC] p-4">
              <p className="text-sm font-semibold text-[#1E293B]">30-Day Trend Intelligence</p>
              <div className="mt-3 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}`, 'Stress Index']} />
                    <ReferenceArea y1={0} y2={35} fill="#10B981" fillOpacity={0.08} label="Progress Zone" />
                    <ReferenceArea y1={70} y2={100} fill="#EF4444" fillOpacity={0.1} label="Chronic Zone" />
                    <Area
                      type="monotone"
                      dataKey="stress"
                      stroke="#0369A1"
                      fill="#7DD3FC"
                      fillOpacity={0.35}
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <ol className="mt-7 space-y-4">
            {history.map((entry, index) => {
              const previous = history[index + 1]?.stress_index
              const trend = getTrendIcon(Number(entry.stress_index || 0), Number(previous))
              const TrendIcon = trend.icon

              return (
                <li key={entry.id} className="rounded-2xl border border-[#0369A1]/20 bg-[#F8FAFC] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#1E293B]/70">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xl font-semibold">Stress Index: {Number(entry.stress_index).toFixed(2)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[#1E293B]/60">Session Report Card</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#0369A1]/10 px-3 py-1 text-xs font-semibold text-[#0369A1]">
                        {entry.burnout_status}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold ${trend.tone}`}>
                        <TrendIcon size={14} />
                        {trend.label}
                      </span>
                    </div>
                  </div>

                  {(entry?.coping_context?.mood_choice || entry?.coping_context?.journal_entry) && (
                    <div className="mt-4 space-y-2 rounded-xl border border-[#0369A1]/20 bg-white p-3">
                      {entry?.coping_context?.mood_choice && (
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0369A1]">
                          Mood Poll: {entry.coping_context.mood_choice.replaceAll('_', ' ')}
                        </p>
                      )}
                      {entry?.coping_context?.journal_entry && (
                        <p className="text-sm text-[#1E293B]/80">"{entry.coping_context.journal_entry}"</p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
            </ol>
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="inline-flex rounded-xl bg-[#0369A1] px-5 py-2.5 font-semibold text-white transition hover:bg-[#03537d]"
          >
            Back to Dashboard
          </Link>
          <Link
            to="/"
            className="inline-flex rounded-xl border border-[#0369A1]/35 bg-white px-5 py-2.5 font-semibold text-[#0369A1] transition hover:bg-[#0369A1]/6"
          >
            Start New Check-in
          </Link>
        </div>
      </section>
    </motion.main>
  )
}

export default HistoryPage

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const statusConfig = {
  Low: {
    message: 'Your digital vitality is stable.',
    toneClass: 'bg-[#10B981]/12 border-[#10B981]/30 text-[#047857]',
  },
  Moderate: {
    message: 'Signs of digital fatigue detected.',
    toneClass: 'bg-[#F59E0B]/12 border-[#F59E0B]/30 text-[#B45309]',
  },
  Critical: {
    message: 'Immediate physical reset required.',
    toneClass: 'bg-[#EF4444]/12 border-[#EF4444]/30 text-[#B91C1C]',
  },
}

function getGaugeColor(stressIndex) {
  if (stressIndex <= 30) {
    return '#10B981'
  }
  if (stressIndex <= 70) {
    return '#F59E0B'
  }
  return '#EF4444'
}

function DashboardPlaceholder() {
  const { state } = useLocation()
  const [analysis, setAnalysis] = useState(state?.analysis || null)
  const [isLoading, setIsLoading] = useState(!state?.analysis)

  useEffect(() => {
    if (state?.analysis) {
      setAnalysis(state.analysis)
      setIsLoading(false)
      return
    }

    const timer = setTimeout(() => {
      try {
        const cached = sessionStorage.getItem('sukoon_latest_analysis')
        if (cached) {
          setAnalysis(JSON.parse(cached))
        }
      } catch (error) {
        console.error('Unable to parse cached analysis', error)
      } finally {
        setIsLoading(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [state])

  const stressIndex = useMemo(() => {
    return Math.max(0, Math.min(Number(analysis?.stress_index || 0), 100))
  }, [analysis])

  const burnoutStatus = analysis?.burnout_status || 'Low'
  const banner = statusConfig[burnoutStatus] || statusConfig.Low
  const gaugeColor = getGaugeColor(stressIndex)
  const vocalFatigueScore = Number(analysis?.vocal_analysis?.vocal_fatigue_score || 0)
  const vocalHealthAlert = vocalFatigueScore >= 0.6 || analysis?.vocal_penalty_applied

  const impactData = useMemo(() => {
    return [
      {
        factor: 'Screen Overload',
        value: Number(analysis?.stress_breakdown?.screen_score || 0),
        cap: 50,
      },
      {
        factor: 'Physical Stagnation',
        value: Number(analysis?.stress_breakdown?.sedentary_score || 0),
        cap: 30,
      },
      {
        factor: 'Rest Deficit',
        value: Number(analysis?.stress_breakdown?.sleep_score || 0),
        cap: 20,
      },
    ]
  }, [analysis])

  if (isLoading) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-[#F8FAFC] px-6 py-10 text-[#1E293B]"
      >
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-[#0369A1]/20 bg-white p-8 shadow-[0_20px_40px_rgba(3,105,161,0.08)]">
          <div className="flex items-center gap-3">
            <span className="dash-spinner" />
            <div>
              <p className="text-lg font-semibold">Loading your dashboard</p>
              <p className="text-sm text-[#1E293B]/70">Processing biomarkers and clinical signals...</p>
            </div>
          </div>
        </section>
      </motion.main>
    )
  }

  if (!analysis) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-[#F8FAFC] px-6 py-10 text-[#1E293B]"
      >
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-[#0369A1]/20 bg-white p-8 shadow-[0_20px_40px_rgba(3,105,161,0.08)]">
          <h1 className="text-2xl font-semibold">No analysis available yet</h1>
          <p className="mt-2 text-[#1E293B]/75">Complete a check-in to generate your vitality dashboard.</p>
          <Link
            to="/input"
            className="mt-6 inline-flex rounded-xl bg-[#0369A1] px-5 py-2.5 font-semibold text-white transition hover:bg-[#03537d]"
          >
            Start Check-in
          </Link>
        </section>
      </motion.main>
    )
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen bg-[#F8FAFC] px-6 py-10 text-[#1E293B]"
    >
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`rounded-2xl border px-5 py-3 text-sm font-semibold ${banner.toneClass}`}
        >
          {banner.message}
        </motion.div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.article
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-3xl border border-[#0369A1]/20 bg-white p-6 shadow-[0_20px_40px_rgba(3,105,161,0.08)]"
          >
            <p className="text-sm font-medium text-[#1E293B]/70">Vitality Gauge</p>
            <div className="relative mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={[{ name: 'load', value: stressIndex, fill: gaugeColor }]}
                  cx="50%"
                  cy="90%"
                  innerRadius="58%"
                  outerRadius="100%"
                  startAngle={180}
                  endAngle={0}
                  barSize={26}
                >
                  <RadialBar
                    minAngle={2}
                    background={{ fill: '#E2E8F0' }}
                    clockWise
                    dataKey="value"
                    cornerRadius={14}
                    isAnimationActive
                    animationDuration={1100}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
                <p className="text-5xl font-semibold" style={{ color: gaugeColor }}>{stressIndex.toFixed(1)}</p>
                <p className="mt-2 text-sm font-medium text-[#1E293B]/70">Current Cognitive Load</p>
              </div>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className="rounded-3xl border border-[#0369A1]/20 bg-white p-6 shadow-[0_20px_40px_rgba(3,105,161,0.08)]"
          >
            <h2 className="text-xl font-semibold">Sukoon Insight</h2>
            <p className="mt-3 leading-relaxed text-[#1E293B]/85">
              {analysis?.gemini_insight?.insight || 'Analysis insight unavailable.'}
            </p>

            <p className="mt-4 rounded-xl bg-[#0369A1]/7 p-3 text-sm text-[#1E293B]/80">
              {analysis?.gemini_insight?.recommendation || 'Recommendation unavailable.'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                  vocalHealthAlert
                    ? 'border-[#EF4444]/35 bg-[#EF4444]/12 text-[#B91C1C]'
                    : 'border-[#10B981]/35 bg-[#10B981]/12 text-[#047857]'
                }`}
              >
                Vocal Health {vocalHealthAlert ? 'Alert' : 'Stable'}
              </span>
              <span className="text-sm text-[#1E293B]/70">
                {vocalHealthAlert
                  ? 'Prosodic Narrowing detected: reduced vocal variability may indicate fatigue strain.'
                  : 'No significant prosodic narrowing detected in the submitted sample.'}
              </span>
            </div>
          </motion.article>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="rounded-3xl border border-[#0369A1]/20 bg-white p-6 shadow-[0_20px_40px_rgba(3,105,161,0.08)]"
        >
          <h2 className="text-xl font-semibold">Impact Factors</h2>
          <p className="mt-1 text-sm text-[#1E293B]/70">
            Weighted math model: Screen Overload (50%), Physical Stagnation (30%), Rest Deficit (20%).
          </p>

          <div className="mt-5 h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactData} layout="vertical" margin={{ top: 8, right: 24, left: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 50]} tick={{ fill: '#1E293B', fontSize: 12 }} />
                <YAxis dataKey="factor" type="category" width={130} tick={{ fill: '#1E293B', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(3, 105, 161, 0.08)' }}
                  formatter={(value, name, item) => [`${Number(value).toFixed(2)} / ${item.payload.cap}`, 'Contribution']}
                  contentStyle={{ borderRadius: 12, borderColor: 'rgba(3,105,161,0.2)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#0369A1" isAnimationActive animationDuration={1100} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.4 }}
          className="flex flex-wrap gap-4"
        >
          <Link
            to="/coping"
            state={{ analysis }}
            className="inline-flex items-center justify-center rounded-xl bg-[#0369A1] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#03537d]"
          >
            Explore Coping Strategies
          </Link>
          <Link
            to="/history"
            state={{ analysis }}
            className="inline-flex items-center justify-center rounded-xl border border-[#0369A1]/35 bg-white px-6 py-3 text-sm font-semibold text-[#0369A1] transition hover:bg-[#0369A1]/6"
          >
            View History
          </Link>
        </motion.section>
      </section>
    </motion.main>
  )
}

export default DashboardPlaceholder

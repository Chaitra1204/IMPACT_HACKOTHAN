import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Award, Info, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const demoAnalysis = {
  stress_index: 72,
  burnout_status: 'Critical',
  gemini_insight: {
    insight: 'Your vocal patterns indicate high cognitive load from prolonged screen exposure.',
  },
  vocal_analysis: {
    vocal_fatigue_score: 0.72,
  },
}

function getGaugeColor(stressIndex) {
  if (stressIndex <= 30) return '#10B981'
  if (stressIndex <= 70) return '#F59E0B'
  return '#EF4444'
}

function getRiskBand(stressIndex) {
  if (stressIndex <= 30) {
    return {
      label: 'Low Load',
      explanation: 'Your current markers suggest a stable mental load baseline.',
    }
  }
  if (stressIndex <= 70) {
    return {
      label: 'Elevated Load',
      explanation: 'Strain is accumulating. Early reset actions can prevent escalation.',
    }
  }
  return {
    label: 'High Load',
    explanation: 'High strain detected. Prioritize immediate recovery and support.',
  }
}

function getCenterSeverity(stressIndex) {
  if (stressIndex <= 30) return 'Low'
  if (stressIndex <= 70) return 'Elevated'
  return 'Critical'
}

function Dashboard({ analysisData }) {
  const { state } = useLocation()
  const [trendSummary, setTrendSummary] = useState(null)
  const [trendRefreshKey, setTrendRefreshKey] = useState(0)

  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', [])

  const analysis = useMemo(() => {
    if (analysisData) return analysisData
    if (state?.analysis) return state.analysis

    try {
      const cached = sessionStorage.getItem('sukoon_latest_analysis')
      if (cached) {
        return JSON.parse(cached)
      }
    } catch {
      // If cached data is malformed, safely fall back to demo data.
    }

    return demoAnalysis
  }, [analysisData, state])

  const stressIndex = Math.max(0, Math.min(100, Number(analysis?.stress_index ?? demoAnalysis.stress_index)))
  const status = analysis?.burnout_status || demoAnalysis.burnout_status
  const trendStatus = analysis?.trend_status || analysis?.status || null
  const insightText = analysis?.gemini_insight?.insight || demoAnalysis.gemini_insight.insight
  const insightRecommendation = analysis?.gemini_insight?.recommendation || 'Take a short screen-free reset now.'
  const gaugeColor = getGaugeColor(stressIndex)
  const vocalFatigueScore = Number(analysis?.vocal_analysis?.vocal_fatigue_score ?? 0)
  const showVocalBadge = vocalFatigueScore > 0.7
  const riskBand = getRiskBand(stressIndex)
  const centerSeverity = getCenterSeverity(stressIndex)
  const needleRotation = -90 + (stressIndex / 100) * 180

  const sourceData = useMemo(() => {
    const raw = [
      {
        name: 'Screen',
        value: Number(analysis?.stress_breakdown?.screen_score ?? 0) * 0.4,
        color: '#0EA5E9',
      },
      {
        name: 'Sedentary',
        value: Number(analysis?.stress_breakdown?.sedentary_score ?? 0) * 0.2,
        color: '#38BDF8',
      },
      {
        name: 'Sleep',
        value: Number(analysis?.stress_breakdown?.sleep_score ?? 0) * 0.2,
        color: '#7DD3FC',
      },
      {
        name: 'Vocal',
        value: Number(analysis?.stress_breakdown?.vocal_score ?? 0) * 0.2,
        color: '#0284C7',
      },
    ]

    const total = raw.reduce((sum, item) => sum + item.value, 0) || 1
    return raw.map((item) => ({
      ...item,
      contribution: Number(((item.value / total) * 100).toFixed(1)),
    }))
  }, [analysis])

  const dominantDriver = useMemo(() => {
    return sourceData.reduce((top, item) => (item.contribution > top.contribution ? item : top), sourceData[0])
  }, [sourceData])

  useEffect(() => {
    const analyzeTrends = async () => {
      try {
        const cachedHistory = JSON.parse(localStorage.getItem('sukoon_history') || '[]')
        const compactHistory = cachedHistory.slice(0, 30).map((entry) => ({
          timestamp: entry.timestamp,
          stress_index: Number(entry.stress_index || 0),
          screen_time: Number(entry.screen_time || 0),
          sedentary_time: Number(entry.sedentary_time || 0),
        }))

        const params = new URLSearchParams({
          current_stress_index: String(stressIndex),
          days: '30',
          history_json: encodeURIComponent(JSON.stringify(compactHistory)),
        })

        const response = await fetch(`${apiBaseUrl}/analyze-trends?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Trend analysis unavailable')
        }
        const payload = await response.json()
        setTrendSummary(payload)

        if (payload?.status === 'RECOVERY_EXCELLENCE') {
          const module = await import('canvas-confetti')
          const confetti = module.default

          const duration = 2400
          const animationEnd = Date.now() + duration
          const colors = ['#10B981', '#0EA5E9', '#22D3EE', '#A7F3D0']

          const frame = () => {
            confetti({
              particleCount: 3,
              angle: 60,
              spread: 70,
              origin: { x: 0, y: 0.6 },
              colors,
            })
            confetti({
              particleCount: 3,
              angle: 120,
              spread: 70,
              origin: { x: 1, y: 0.6 },
              colors,
            })

            if (Date.now() < animationEnd) {
              requestAnimationFrame(frame)
            }
          }

          frame()
        }
      } catch {
        setTrendSummary(null)
      }
    }

    analyzeTrends()
  }, [apiBaseUrl, stressIndex, trendRefreshKey])

  const seedTrendDemo = (mode) => {
    const now = Date.now()
    const demo = Array.from({ length: 10 }, (_, index) => {
      const daysAgo = 9 - index
      const baseTimestamp = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString()

      if (mode === 'chronic') {
        return {
          id: now + index,
          timestamp: baseTimestamp,
          stress_index: 78 + (index % 5),
          screen_time: 9.4,
          sedentary_time: 6.8,
          burnout_status: 'Critical',
        }
      }

      return {
        id: now + index,
        timestamp: baseTimestamp,
        stress_index: 68 - index * 3,
        screen_time: 8 - index * 0.5,
        sedentary_time: 6 - index * 0.35,
        burnout_status: index > 4 ? 'Moderate' : 'Low',
      }
    })

    localStorage.setItem('sukoon_history', JSON.stringify(demo.reverse()))
    setTrendRefreshKey((prev) => prev + 1)
  }

  const ctaIsCritical = trendSummary?.status === 'CHRONIC_BURN_RISK'
  const isChronicTheme = ctaIsCritical || trendStatus === 'CHRONIC_BURN_RISK'
  const ctaLabel = ctaIsCritical
    ? '⚠️ Critical Pattern Detected: Consult a Professional'
    : 'Explore Coping Strategies'
  const ctaHref = ctaIsCritical
    ? 'https://www.google.com/search?q=licensed+therapist+near+me+mental+health'
    : '/coping'
  const ctaButtonClass = ctaIsCritical
    ? 'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-base font-semibold text-white shadow-[0_14px_30px_rgba(225,29,72,0.25)] transition hover:bg-rose-700 md:w-auto'
    : 'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-6 py-4 text-base font-semibold text-white shadow-[0_14px_30px_rgba(3,105,161,0.25)] transition hover:bg-sky-800 md:w-auto'

  const statusTone =
    status === 'Critical'
      ? 'border-[#EF4444]/25 bg-[#EF4444]/10 text-[#B91C1C]'
      : status === 'Moderate'
        ? 'border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[#B45309]'
        : 'border-[#10B981]/25 bg-[#10B981]/10 text-[#047857]'

  return (
    <main
      className={`min-h-screen px-5 py-8 text-slate-800 md:px-8 md:py-10 ${
        isChronicTheme
          ? 'bg-[radial-gradient(circle_at_top_left,_#fff1f2_0%,_#ffe4e6_45%,_#fff7f7_100%)]'
          : 'bg-[radial-gradient(circle_at_top_left,_#eff6ff_0%,_#f8fafc_45%,_#ffffff_100%)]'
      }`}
    >
      <section className="mx-auto max-w-6xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`rounded-2xl border bg-white/80 px-5 py-4 backdrop-blur ${
            isChronicTheme ? 'border-rose-300/70' : 'border-sky-200/60'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700/80">Sukoon Results</p>
              <h1 className="text-2xl font-semibold text-slate-900">Clinical Burnout Dashboard</h1>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusTone}`}>
              Status: {status}
            </span>
          </div>
        </motion.header>

        <section className="grid gap-6 lg:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
            className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">Vitality Gauge</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{riskBand.label}</span>
            </div>

            <div className="mt-5 flex flex-col items-center text-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <p className="text-5xl font-semibold leading-none sm:text-6xl" style={{ color: gaugeColor }}>
                  {Math.round(stressIndex)}
                </p>
                {showVocalBadge ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700">
                    <AlertTriangle size={12} />
                    Vocal Pattern: Fatigued (Prosodic Narrowing)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    <Info size={12} />
                    Vocal Pattern: Stable
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-medium" style={{ color: gaugeColor }}>
                Stress Index • {centerSeverity}
              </p>
            </div>

            <div className="relative mt-4 h-[250px] w-full sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={[{ name: 'Stress Index', value: stressIndex, fill: gaugeColor }]}
                  innerRadius="66%"
                  outerRadius="100%"
                  cx="50%"
                  cy="84%"
                  startAngle={180}
                  endAngle={0}
                  barSize={24}
                >
                  <RadialBar
                    dataKey="value"
                    background={{ fill: '#E2E8F0' }}
                    cornerRadius={14}
                    isAnimationActive
                    animationDuration={1200}
                    animationBegin={150}
                  />
                </RadialBarChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-[86px] sm:pb-[94px]">
                <div
                  className="h-20 w-[2px] origin-bottom rounded-full bg-slate-700/75 sm:h-24"
                  style={{ transform: `rotate(${needleRotation}deg)` }}
                />
                <div className="absolute bottom-[82px] h-3 w-3 rounded-full border-2 border-white bg-slate-700 sm:bottom-[90px]" />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-500 sm:text-xs"
            >
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">0-30 Low</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">31-70 Elevated</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">71-100 High</span>
            </motion.div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">What this means</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{riskBand.explanation}</p>
            </div>
          </motion.article>

          <div className="space-y-6">
            <motion.article
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.16 }}
              className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Source Analysis</h2>
                <span className="text-xs font-medium text-slate-500">Top Driver: {dominantDriver?.name || 'N/A'}</span>
              </div>

              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceData} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={122}
                      tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                      formatter={(value, _, item) => [`${item.payload.contribution}%`, 'Contribution']}
                      contentStyle={{ borderRadius: '12px', borderColor: 'rgba(148,163,184,0.35)' }}
                    />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} isAnimationActive animationDuration={1100}>
                      {sourceData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="contribution"
                        position="right"
                        formatter={(value) => `${value}%`}
                        style={{ fill: '#0F172A', fontSize: 12, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 rounded-xl border border-sky-200/70 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                {dominantDriver?.name || 'Primary driver'} is contributing most right now at{' '}
                <span className="font-semibold">{dominantDriver?.contribution || 0}%</span> of current stress load.
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.22 }}
              className="relative overflow-visible rounded-3xl border border-white/60 bg-white/45 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Sukoon Insight</h2>
                  <p className="mt-3 leading-relaxed text-slate-700">{insightText}</p>
                  <p className="mt-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
                    Next best action: {insightRecommendation}
                  </p>
                </div>

                <div className="hidden" />
              </div>
            </motion.article>
          </div>
        </section>

        {trendSummary?.status === 'CHRONIC_BURN_RISK' && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4"
          >
            <div className="flex flex-wrap items-center gap-3 text-rose-700">
              <ShieldAlert className="animate-pulse" size={22} />
              <p className="text-sm font-semibold">
                Chronic burn risk detected across {trendSummary?.consecutive_chronic_days || 0} consecutive days.
              </p>
            </div>
            <p className="mt-2 text-sm text-rose-700/90">
              Most apps react after collapse. Sukoon identifies sustained chronic load and escalates early.
            </p>
            <a
              href="https://www.google.com/search?q=licensed+therapist+near+me+mental+health"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Professional Therapist Consultation
              <ShieldAlert size={16} />
            </a>
          </motion.section>
        )}

        {trendSummary?.status === 'RECOVERY_EXCELLENCE' && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-emerald-700">
              <Award size={20} />
              <p className="text-sm font-semibold">Resilience Badge Unlocked: Recovery Excellence</p>
            </div>
            <p className="mt-2 text-sm text-emerald-700/90">
              {trendSummary?.victory_message || 'You are trending 20% below your 7-day stress baseline. Keep going.'}
            </p>
          </motion.section>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
          className="flex flex-wrap items-center gap-3 pt-1"
        >
          {ctaIsCritical ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noreferrer"
              className={ctaButtonClass}
            >
              {ctaLabel}
              <ShieldAlert size={18} className="animate-pulse" />
            </a>
          ) : (
            <Link
              to={ctaHref}
              state={{ analysis }}
              className={ctaButtonClass}
            >
              {ctaLabel}
              <ArrowRight size={18} />
            </Link>
          )}
          <Link to="/history" className={ctaButtonClass}>History</Link>
        </motion.div>
      </section>
    </main>
  )
}

export default Dashboard
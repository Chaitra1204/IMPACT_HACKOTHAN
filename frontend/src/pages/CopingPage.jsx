import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Heart, MapPin, Quote, ShieldAlert, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const highStressOptions = [
  { key: 'work_pressure', label: 'Work Pressure' },
  { key: 'digital_fatigue', label: 'Digital Fatigue' },
  { key: 'lonely', label: 'Social Isolation' },
  { key: 'other', label: 'Other' },
]

const lowStressOptions = [
  { key: 'productive', label: 'Achievement' },
  { key: 'socially_active', label: 'Social Joy' },
  { key: 'relaxed', label: 'Creative Flow' },
  { key: 'other', label: 'Other' },
]

const fallbackContext = {
  mood_title: 'Work Pressure',
  journal_prompt:
    'Name the single hardest task and write the smallest next action you can take in 15 minutes.',
  quote:
    'Progress in pressure comes from clarity, not speed.',
  coping_actions: [
    'Take one 2-minute breath reset before resuming work.',
    'Prioritize one mission-critical task and defer two non-essentials.',
    'Use a 25-minute focus block with notifications paused.',
  ],
  urgency_note:
    'Moderate strain detected. Early resets now can prevent escalation later.',
  clinical_recommendation:
    'Prescribed for autonomic down-regulation after prolonged cognitive strain.',
  events: [],
  events_source: 'fallback',
}

function CopingPage() {
  const { state } = useLocation()
  const [analysis, setAnalysis] = useState(state?.analysis || null)
  const [showSafetyModal, setShowSafetyModal] = useState(false)
  const [safetyExpanded, setSafetyExpanded] = useState(false)
  const [selectedMood, setSelectedMood] = useState('work_pressure')
  const [customMood, setCustomMood] = useState('')
  const [city, setCity] = useState('Bengaluru')
  const [journalEntry, setJournalEntry] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [contextualPlan, setContextualPlan] = useState(fallbackContext)
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [planError, setPlanError] = useState('')

  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', [])

  useEffect(() => {
    if (state?.analysis) {
      setAnalysis(state.analysis)
      return
    }
    const cached = sessionStorage.getItem('sukoon_latest_analysis')
    if (cached) {
      setAnalysis(JSON.parse(cached))
    }
  }, [state])

  const burnoutStatus = analysis?.burnout_status || 'Low'
  const stressIndex = Number(analysis?.stress_index || 0)
  const isStressedMode = stressIndex > 60
  const isSparkMode = stressIndex < 30
  const moodOptions = isSparkMode ? lowStressOptions : highStressOptions
  const selectedMoodForApi =
    selectedMood === 'other' ? (isSparkMode ? 'productive' : 'work_pressure') : selectedMood
  const escalationRequired = Boolean(
    analysis?.escalation_required ?? analysis?.gemini_insight?.escalation
  )

  useEffect(() => {
    const nextDefaultMood = stressIndex < 30 ? 'productive' : 'work_pressure'
    setSelectedMood(nextDefaultMood)
  }, [stressIndex])

  useEffect(() => {
    if (escalationRequired) {
      setShowSafetyModal(true)
      setSafetyExpanded(true)
    }
  }, [escalationRequired])

  const loadContextualPlan = async () => {
    setPlanError('')
    setIsLoadingPlan(true)
    try {
      const query = new URLSearchParams({
        mood: selectedMoodForApi,
        city,
        burnout_status: burnoutStatus,
        stress_index: String(stressIndex),
      })

      const response = await fetch(`${apiBaseUrl}/contextual-coping?${query.toString()}`)
      if (!response.ok) {
        throw new Error('Unable to load contextual coping plan right now.')
      }

      const payload = await response.json()
      setContextualPlan({
        ...fallbackContext,
        ...payload,
        mood_title:
          selectedMood === 'other' && customMood.trim()
            ? `${payload.mood_title} - Focus: ${customMood.trim()}`
            : payload.mood_title,
      })
    } catch (error) {
      setPlanError(error.message || 'Unable to fetch recommendations right now.')
      setContextualPlan(fallbackContext)
    } finally {
      setIsLoadingPlan(false)
    }
  }

  useEffect(() => {
    loadContextualPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistCopingContext = () => {
    const history = JSON.parse(localStorage.getItem('sukoon_history') || '[]')
    if (!history.length) {
      setSaveMessage('No history session available yet. Run a check-in first.')
      return
    }

    const updated = [...history]
    updated[0] = {
      ...updated[0],
      coping_context: {
        mood_choice: selectedMood,
        custom_mood: customMood.trim(),
        journal_entry: journalEntry,
        city,
        saved_at: new Date().toISOString(),
      },
    }
    localStorage.setItem('sukoon_history', JSON.stringify(updated))
    setSaveMessage('Mood and journal saved to your recovery history.')
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0%,_#f8fafc_42%,_#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 sm:py-10"
    >
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-200/70 bg-white/90 p-6 shadow-[0_22px_50px_rgba(3,105,161,0.10)] backdrop-blur md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-100/70 blur-2xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700/80">Action Layer</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">Personalized Coping Studio</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Select what feels most true, then Sukoon builds a focused coping protocol and local social prescriptions.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-800">
            Status: {burnoutStatus} • Stress Index: {stressIndex.toFixed(1)}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-semibold text-slate-900">Mood Deep-Dive</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSparkMode ? "What's the spark?" : "What's the weight?"}
            </p>

            {!isSparkMode && !isStressedMode && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Moderate zone detected. We are using weight-focused chips to prevent escalation.
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {moodOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedMood(option.key)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    selectedMood === option.key
                      ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-[0_8px_18px_rgba(3,105,161,0.12)]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50/60'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {selectedMood === 'other' && (
              <div className="mt-4">
                <label className="text-sm font-medium text-slate-600" htmlFor="custom-mood">
                  Personalize your choice
                </label>
                <input
                  id="custom-mood"
                  value={customMood}
                  onChange={(event) => setCustomMood(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-sky-400"
                  placeholder="e.g. Exam stress, relationship strain, family responsibilities"
                />
              </div>
            )}

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-600" htmlFor="city">
                Your City
              </label>
              <input
                id="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-sky-400"
                placeholder="e.g. Bengaluru"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-600" htmlFor="journal-entry">
                Journal Entry
              </label>
              <textarea
                id="journal-entry"
                value={journalEntry}
                onChange={(event) => setJournalEntry(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                placeholder="Capture one honest reflection from today..."
              />
            </div>

            <button
              type="button"
              onClick={loadContextualPlan}
              disabled={isLoadingPlan || (selectedMood === 'other' && !customMood.trim())}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(3,105,161,0.22)] transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Sparkles size={16} />
              {isLoadingPlan ? 'Generating Plan...' : 'Generate Personalized Plan'}
            </button>

            <button
              type="button"
              onClick={persistCopingContext}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
            >
              Save Mood + Journal to History
            </button>

            {saveMessage && <p className="mt-2 text-sm text-emerald-700">{saveMessage}</p>}

            {planError && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {planError}
              </p>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-semibold text-slate-900">Sukoon Personal Guidance</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">{contextualPlan.mood_title}</p>
            <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{contextualPlan.urgency_note}</p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Journaling Prompt</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{contextualPlan.journal_prompt}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
                <Quote size={12} />
                Grounding Quote
              </p>
              <p className="mt-2 text-sm italic leading-relaxed text-amber-900">"{contextualPlan.quote}"</p>
            </div>

            <ul className="mt-4 space-y-2">
              {contextualPlan.coping_actions.map((action) => (
                <li key={action} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {action}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Social Prescriptions</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Source: {contextualPlan.events_source}
            </span>
          </div>
          <p className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
            Clinical Recommendation: {contextualPlan.clinical_recommendation}
          </p>

          {contextualPlan.events.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No local events found right now. Try a nearby city name.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {contextualPlan.events.slice(0, 3).map((eventItem) => (
                <article
                  key={`${eventItem.name}-${eventItem.date}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50"
                >
                  <p className="text-sm font-semibold text-slate-900">{eventItem.name}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays size={12} />
                    {eventItem.date}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} />
                    {eventItem.location}
                  </p>
                  <p className="mt-2 text-xs font-medium text-sky-700">
                    {eventItem.is_free ? 'Free Event' : 'Paid Event'} | {eventItem.category}
                  </p>
                  <div className="mt-3">
                    <span className="inline-flex rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                      Clinical Recommendation
                    </span>
                  </div>
                  <a
                    href={eventItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
                  >
                    Join Community
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          className={`rounded-2xl border-2 border-rose-300 bg-rose-50 p-6 shadow-[0_14px_30px_rgba(244,63,94,0.12)] transition ${
            safetyExpanded ? 'ring-4 ring-rose-200' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => setSafetyExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-rose-500" size={24} />
              <div>
                <h2 className="text-xl font-semibold text-rose-700">Get Help Now</h2>
                <p className="text-sm text-rose-600">Professional Support Safety Net</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-rose-700">{safetyExpanded ? 'Hide' : 'Show'}</span>
          </button>

          {safetyExpanded && (
            <div className="mt-5 space-y-3">
              <a href="tel:+919999666555" className="block rounded-xl bg-rose-500 px-4 py-3 text-center text-sm font-semibold text-white">
                Call Vandrevala Foundation (India)
              </a>
              <a href="tel:988" className="block rounded-xl bg-rose-700 px-4 py-3 text-center text-sm font-semibold text-white">
                Call 988 Suicide & Crisis Lifeline (US)
              </a>
              <a
                href="https://www.google.com/search?q=find+therapist+near+me"
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-rose-300 bg-white px-4 py-3 text-center text-sm font-semibold text-rose-700"
              >
                Find a Therapist
              </a>
            </div>
          )}
        </section>

        <section className="flex flex-wrap gap-4 pb-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            <Heart size={16} />
            Start New Check-in
          </Link>
          <Link
            to="/history"
            className="inline-flex items-center justify-center rounded-xl border border-sky-300 bg-white px-6 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            History
          </Link>
        </section>
      </section>

      {showSafetyModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-6">
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl rounded-2xl border-2 border-rose-300 bg-white p-6 shadow-[0_24px_50px_rgba(127,29,29,0.28)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold text-rose-700">Immediate Support Recommended</h3>
                <p className="mt-2 text-sm text-rose-700">
                  Your latest signals suggest elevated distress. Please contact a support service now.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSafetyModal(false)}
                className="rounded-lg border border-rose-300 px-3 py-1 text-sm font-semibold text-rose-700"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <a href="tel:+919999666555" className="rounded-xl bg-rose-500 px-4 py-3 text-center text-sm font-semibold text-white">
                Call Vandrevala Foundation (India)
              </a>
              <a href="tel:988" className="rounded-xl bg-rose-700 px-4 py-3 text-center text-sm font-semibold text-white">
                Call 988 Suicide & Crisis Lifeline (US)
              </a>
              <a
                href="https://www.google.com/search?q=find+therapist+near+me"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-rose-300 bg-white px-4 py-3 text-center text-sm font-semibold text-rose-700"
              >
                Find a Therapist
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </motion.main>
  )
}

export default CopingPage

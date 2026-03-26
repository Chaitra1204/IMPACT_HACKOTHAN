import { motion } from 'framer-motion'
import { Activity, Mic, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const featureItems = [
  {
    title: 'Screen Analysis',
    description: 'Cognitive load monitoring based on digital exposure patterns.',
    icon: Activity,
  },
  {
    title: 'Vocal Biomarkers',
    description: 'Detecting fatigue signals in voice using Librosa-powered audio analysis.',
    icon: Mic,
  },
  {
    title: 'Physical Resets',
    description: 'Personalized micro-movements to reset posture and recover focus.',
    icon: Sparkles,
  },
]

function HomePage() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen bg-[#F8FAFC] px-6 py-12 text-[#1E293B]"
    >
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-3xl border border-[#0369A1]/20 bg-white p-8 shadow-[0_20px_40px_rgba(3,105,161,0.08)] md:p-12">
          <p className="mb-4 inline-flex rounded-full border border-[#0369A1]/25 bg-[#0369A1]/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0369A1]">
            Clinical Minimalist Interface
          </p>

          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Sukoon: Your Digital Vitality Sentry.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#1E293B]/80">
            Sukoon uses Digital Phenotyping to identify burnout risk by combining screen-time patterns,
            sedentary behavior, and reflection signals into a calm, clear health intelligence check-in.
          </p>

          <div className="mt-8">
            <Link
              to="/input"
              className="inline-flex items-center justify-center rounded-xl bg-[#0369A1] px-7 py-3 text-base font-semibold text-white transition hover:bg-[#03537d]"
            >
              Start Your Check-in
            </Link>
          </div>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {featureItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08, duration: 0.35 }}
                className="rounded-2xl border border-[#0369A1]/15 bg-white p-6 shadow-[0_14px_26px_rgba(3,105,161,0.06)]"
              >
                <div className="mb-4 inline-flex rounded-lg bg-[#0369A1]/10 p-3 text-[#0369A1]">
                  <Icon size={20} />
                </div>
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="mt-3 leading-relaxed text-[#1E293B]/75">{item.description}</p>
              </motion.article>
            )
          })}
        </section>
      </section>
    </motion.main>
  )
}

export default HomePage

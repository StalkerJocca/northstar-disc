import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import ProgressBadge from './components/ProgressBadge'
import ResultCard from './components/ResultCard'
import { submitDiscScore } from './lib/discApi'
import { appBrand, exportCopy, milestoneCopy, nextStepGuidance, onboardingCopy, resultHighlights } from './lib/content'
import { traitMeta } from './lib/discProfile'
import type { DiscScoreResponse } from './types/disc'

const questions = [
  {
    prompt: 'When I’m building momentum, I tend to...',
    options: [
      { label: 'Move quickly and decisively', trait: 'D' },
      { label: 'Bring warmth and energy to the room', trait: 'I' },
      { label: 'Create steady calm and consistency', trait: 'S' },
      { label: 'Refine details and improve accuracy', trait: 'C' },
    ],
  },
  {
    prompt: 'In a group setting, I often feel most useful when I...',
    options: [
      { label: 'Set the direction and pace', trait: 'D' },
      { label: 'Connect people and spark conversation', trait: 'I' },
      { label: 'Support the team with patience', trait: 'S' },
      { label: 'Organize information and structure', trait: 'C' },
    ],
  },
  {
    prompt: 'My natural rhythm is...',
    options: [
      { label: 'Bold, active, and results-led', trait: 'D' },
      { label: 'Bright, expressive, and encouraging', trait: 'I' },
      { label: 'Grounded, dependable, and steady', trait: 'S' },
      { label: 'Thoughtful, methodical, and precise', trait: 'C' },
    ],
  },
]

function App() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [started, setStarted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<DiscScoreResponse['profile'] | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const currentQuestion = questions[step]

  const primaryTrait = profile?.primaryTrait ?? 'D'

  const handleSelect = async (trait: string) => {
    setSelected(trait)
    const nextAnswers = [...answers, trait]
    setAnswers(nextAnswers)

    if (step < questions.length - 1) {
      setTimeout(() => {
        setStep(step + 1)
        setSelected(null)
      }, 220)
      return
    }

    setIsScoring(true)
    setApiError(null)

    try {
      const result = await submitDiscScore({ answers: nextAnswers.map((answer) => ({ trait: answer as 'D' | 'I' | 'S' | 'C' })) })
      if (result.success) {
        setProfile(result.profile)
        setShowResults(true)
      } else {
        setApiError(result.error)
        setShowResults(false)
      }
    } catch (error) {
      const fallbackResult = await submitDiscScore({ answers: nextAnswers.map((answer) => ({ trait: answer as 'D' | 'I' | 'S' | 'C' })) })
      if (fallbackResult.success) {
        setProfile(fallbackResult.profile)
        setShowResults(true)
      } else {
        setApiError(error instanceof Error ? error.message : 'Unable to score your results right now.')
        setShowResults(false)
      }
    } finally {
      setIsScoring(false)
    }
  }

  const progress = ((step + (selected ? 1 : 0)) / questions.length) * 100

  useEffect(() => {
    if (!showResults) {
      return
    }

    setCelebrate(true)
    const timeout = window.setTimeout(() => setCelebrate(false), 2200)
    return () => window.clearTimeout(timeout)
  }, [showResults])

  const startReflection = () => {
    setStarted(true)
  }

  const goToIntro = () => {
    setStep(0)
    setAnswers([])
    setSelected(null)
    setShowResults(false)
    setStarted(false)
    setProfile(null)
    setApiError(null)
  }

  const handleShare = async () => {
    const shareText = `${profile?.shareText ?? 'Your DISC reflection is ready.'}\n\nFind your own reflection at northstardisc.app`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'DISC reflection', text: shareText })
        return
      } catch {
        // fall back to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
      return
    } catch {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://disc-wellness.app')}&summary=${encodeURIComponent(shareText)}`,
        '_blank',
        'noopener,noreferrer',
      )
    }
  }

  const handleDownloadCard = () => {
    const primaryLabel = traitMeta[primaryTrait as keyof typeof traitMeta].label
    const highlights = (profile?.highlights ?? []).join(' • ')
    const growthPoints = (profile?.growthPoints ?? []).join(' • ')
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <rect width="1600" height="1000" fill="#fcf7f1" />
        <rect x="70" y="70" width="1460" height="860" rx="38" fill="#fffaf5" stroke="#e7ddd0" stroke-width="3" />
        <rect x="110" y="120" width="1380" height="220" rx="28" fill="url(#bg)" />
        <circle cx="1320" cy="230" r="140" fill="#f3e1cc" fill-opacity="0.55" />
        <rect x="140" y="170" width="82" height="82" rx="20" fill="#f5e4d3" />
        <text x="181" y="221" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#7a5d42">ND</text>
        <text x="250" y="210" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#8c7a6e" letter-spacing="3">NORTHSTAR DISC</text>
        <text x="250" y="260" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="700" fill="#2f241d">${escapeXml(appBrand.tagline)}</text>
        <text x="250" y="310" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="#6f5c51">${escapeXml(profile?.narrative ?? 'Your profile is on its way.')}</text>
        <rect x="110" y="380" width="680" height="300" rx="26" fill="#fffdf9" stroke="#e7ddd0" stroke-width="2" />
        <text x="150" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="#4d3b30">Primary style</text>
        <text x="150" y="485" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700" fill="#3d2d21">${escapeXml(primaryLabel)}</text>
        <text x="150" y="545" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#6e5a4f">${escapeXml(highlights)}</text>
        <rect x="810" y="380" width="680" height="300" rx="26" fill="#fffdf9" stroke="#e7ddd0" stroke-width="2" />
        <text x="850" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="#4d3b30">Growth points</text>
        <text x="850" y="500" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#6e5a4f">${escapeXml(growthPoints)}</text>
        <rect x="110" y="720" width="1380" height="150" rx="26" fill="#f6ebdf" />
        <text x="150" y="780" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="#4d3b30">Share-ready summary</text>
        <text x="150" y="825" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="#6e5a4f">${escapeXml(profile?.shareText ?? 'A calm, thoughtful reflection for your energy profile.')}</text>
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f8efe7" />
            <stop offset="100%" stop-color="#efe0ce" />
          </linearGradient>
        </defs>
      </svg>
    `

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'northstar-disc-results-card.svg'
    link.click()
    URL.revokeObjectURL(url)
  }

  const resultsHeading = profile ? `You feel most aligned with ${traitMeta[primaryTrait as keyof typeof traitMeta].label}` : 'Your gentle profile'
  const completionScore = Math.min(100, Math.round((answers.length / questions.length) * 100))
  const streakLabel = answers.length >= questions.length ? 'Completed' : `${answers.length}/${questions.length} prompts`
  const chartData = (profile?.scores ?? []).map((item) => ({
    subject: traitMeta[item.trait as keyof typeof traitMeta].label,
    value: item.percentage,
  }))
  const shareStatusText = copied ? 'Saved to clipboard' : 'Works beautifully for LinkedIn-style sharing and quick offline export.'
  const confettiPieces = Array.from({ length: 10 }, (_, index) => ({
    id: index,
    left: `${8 + index * 8}%`,
    delay: index * 0.04,
    color: ['#c78e69', '#8b5e3c', '#d8b08b', '#7c6c5f'][index % 4],
  }))

  const escapeXml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe9,_#fcfaf7_60%,_#f4ebe3)] text-stone-700">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between rounded-full border border-stone-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-[linear-gradient(135deg,_#f5ede4,_#e9d9c9)] text-sm font-semibold tracking-[0.25em] text-stone-700">
              ND
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">{appBrand.name}</p>
              <h1 className="text-lg font-semibold text-stone-800">{appBrand.tagline}</h1>
            </div>
          </div>
          <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600">
            {showResults ? 'Results' : started ? `Step ${Math.min(step + 1, questions.length)} of ${questions.length}` : 'Launch'}
          </div>
        </header>

        <AnimatePresence mode="sync">
          {!started && !showResults ? (
            <motion.section
              key="launch"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col justify-center"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.24 }}
                className="mb-5 rounded-[2rem] border border-stone-200/80 bg-white/80 p-6 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-[linear-gradient(135deg,_#f8efe8,_#e8d6c4)] text-sm font-semibold tracking-[0.25em] text-stone-700">
                    ND
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{appBrand.name}</p>
                    <h2 className="text-3xl font-semibold leading-tight text-stone-800 sm:text-4xl">{appBrand.tagline}</h2>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">{appBrand.description}</p>
                <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-medium text-stone-800">Why leaders use it</p>
                  <p className="mt-2">A practical, elegant reflection that helps you understand your communication style with clarity.</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.button
                    type="button"
                    onClick={startReflection}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
                  >
                    Start your reflection
                  </motion.button>
                  <div className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                    3 prompts · instant results
                  </div>
                </div>
              </motion.div>
            </motion.section>
          ) : started && !showResults ? (
            <motion.section
              key="quiz"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col justify-center"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.24 }}
                className="mb-5 rounded-[2rem] border border-stone-200/80 bg-white/80 p-4 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-6"
              >
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-stone-100">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,_#c78e69,_#9b6b4e)]"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.25 }}
                  />
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <ProgressBadge label="Flow" value={`${Math.round(progress)}%`} />
                  <ProgressBadge label="Streak" value={streakLabel} />
                </div>
                <p className="mb-2 text-sm text-stone-500">{onboardingCopy.intro}</p>
                <h2 className="mb-2 text-2xl font-semibold leading-tight text-stone-800 sm:text-3xl">
                  {onboardingCopy.subtitle}
                </h2>
                <p className="mb-4 text-sm leading-7 text-stone-600">{onboardingCopy.note}</p>
                <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-medium text-stone-800">Current prompt</p>
                  <p className="mt-1">{currentQuestion.prompt}</p>
                </div>
                <div className="grid gap-3">
                  {currentQuestion.options.map((option) => (
                    <motion.button
                      key={option.label}
                      type="button"
                      onClick={() => handleSelect(option.trait)}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 ${
                        selected === option.trait
                          ? 'border-stone-600 bg-stone-900 text-white shadow-lg'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-white'
                      }`}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.section>
          ) : (
            <motion.section
              key="results"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-1 flex-col gap-5 py-2"
            >
              <AnimatePresence>
                {celebrate ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[2rem]"
                  >
                    <div className="absolute inset-x-0 top-8 mx-auto w-48 rounded-full border border-stone-200/80 bg-white/70 px-4 py-2 text-center text-sm font-medium text-stone-700 shadow-sm">
                      Reflection complete
                    </div>
                    {confettiPieces.map((piece) => (
                      <motion.span
                        key={piece.id}
                        initial={{ opacity: 0, y: -8, x: 0, scale: 0.8 }}
                        animate={{ opacity: [0, 1, 0], y: [0, 140], x: [0, piece.id % 2 === 0 ? 58 : -58], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.6, ease: 'easeOut', delay: piece.delay }}
                        className="absolute top-16 h-3 w-3 rounded-full"
                        style={{ left: piece.left, backgroundColor: piece.color }}
                      />
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut' }}
                className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Your gentle profile</p>
                    <h2 className="mt-2 text-3xl font-semibold text-stone-800">{resultsHeading}</h2>
                    <p className="mt-3 text-base leading-7 text-stone-600">{profile ? profile.narrative : 'We are preparing your profile now.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ProgressBadge label="Completion" value={`${completionScore}%`} />
                    <ProgressBadge label="Focus" value={profile ? traitMeta[primaryTrait as keyof typeof traitMeta].label : 'Processing…'} />
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <ResultCard
                  eyebrow="What this means in practice"
                  title="A more human read on your style"
                  body={profile?.narrative ?? 'Your profile will appear here once the server-side scoring completes.'}
                >
                  <div className="mt-4 grid gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    {resultHighlights.map((item) => (
                      <p key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-stone-400" />
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Strengths</p>
                      <ul className="mt-2 space-y-2 text-sm text-stone-700">
                        {(profile?.highlights ?? []).map((item: string) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-stone-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Growth points</p>
                      <ul className="mt-2 space-y-2 text-sm text-stone-700">
                        {(profile?.growthPoints ?? []).map((item: string) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-stone-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </ResultCard>

                <motion.section
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.04 }}
                  className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-4 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] sm:p-6"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Energy map</p>
                      <p className="mt-1 text-sm text-stone-600">The shapes are clearer when the lens is calm and aligned.</p>
                    </div>
                    <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-600">
                      Premium view
                    </div>
                  </div>
                  <div className="mt-2 h-80 w-full rounded-[1.5rem] border border-stone-200 bg-[radial-gradient(circle_at_top,_#fffaf6,_#f8efe8)] p-3" aria-label="DISC profile radar chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="78%" data={chartData}>
                        <PolarGrid stroke="#d9c5b1" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6f5f51', fontSize: 12 }} />
                        <Radar
                          name="Profile"
                          dataKey="value"
                          stroke="#8b5e3c"
                          fill="#c78e69"
                          fillOpacity={0.42}
                          strokeWidth={2.4}
                          dot={{ r: 3, fill: '#8b5e3c', strokeWidth: 0 }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.9rem',
                            borderColor: '#e7dfd8',
                            backgroundColor: 'rgba(255,255,255,0.96)',
                          }}
                        />
                        <CartesianGrid stroke="#efe3d6" />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.section>
              </div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.06 }}
                className="rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(135deg,_#f9f3ec,_#f3e4d8)] p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] sm:p-6"
              >
                <div className="mb-4 rounded-2xl border border-stone-200/80 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{milestoneCopy.title}</p>
                  <p className="mt-2 text-sm font-medium text-stone-800">{milestoneCopy.body}</p>
                </div>
                <div className="rounded-[1.5rem] border border-stone-200 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-[linear-gradient(135deg,_#f7eee5,_#e4d0bc)] text-sm font-semibold tracking-[0.25em] text-stone-700">
                        ND
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{exportCopy.title}</p>
                        <p className="text-sm font-semibold text-stone-800">{appBrand.name} results card</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white">
                      Ready to export
                    </div>
                  </div>
                  <div className="mt-4 rounded-[1.25rem] border border-stone-200 bg-[linear-gradient(135deg,_#f9f2eb,_#f1e5d8)] p-4">
                    <p className="text-sm leading-7 text-stone-700">{exportCopy.body}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-sm font-medium text-stone-700">
                        Primary style · {traitMeta[primaryTrait as keyof typeof traitMeta].label}
                      </span>
                      <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-sm font-medium text-stone-700">
                        Share-ready
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Share it with your network</p>
                    <p className="mt-2 text-lg font-semibold text-stone-800">A polished reflection you can post in one tap.</p>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{profile ? 'A calm, thoughtful reflection for your energy profile.' : 'This will be ready as soon as the anonymous scoring completes.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ProgressBadge label="Share" value="Ready" />
                      <ProgressBadge label="Brand" value={appBrand.name} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        type="button"
                        onClick={handleShare}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        animate={copied ? { scale: [1, 1.03, 1], boxShadow: '0 0 0 6px rgba(199, 142, 105, 0.18)' } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
                      >
                        {copied ? 'Copied summary' : 'Copy summary'}
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={handleDownloadCard}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
                      >
                        Download card
                      </motion.button>
                    </div>
                    <motion.p
                      className="text-xs text-stone-500"
                      animate={copied ? { opacity: 1, y: 0 } : { opacity: 0.9, y: 0 }}
                      transition={{ duration: 0.2 }}
                      aria-live="polite"
                    >
                      {shareStatusText}
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.08 }}
                className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{nextStepGuidance.title}</p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-800">A small next step can make this reflection more useful.</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{nextStepGuidance.intro}</p>
                    <ul className="mt-4 space-y-2 text-sm text-stone-700">
                      {nextStepGuidance.actions.map((action) => (
                        <li key={action} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-stone-400" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>


              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.08 }}
                className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Support this work</p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-800">If this helped you, a small coffee keeps the experience going.</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">Your support helps fund more thoughtful reflections, calm design, and thoughtful product updates.</p>
                  </div>
                  <a
                    href="https://www.buymeacoffee.com"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-stone-300 bg-stone-50 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                  >
                    Support this work
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.1 }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <motion.button
                  type="button"
                  onClick={goToIntro}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
                >
                  Back to intro
                </motion.button>
                {apiError ? <p className="text-sm text-stone-500">{apiError}</p> : null}
                {isScoring ? <p className="text-sm text-stone-500">Scoring your response…</p> : null}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App

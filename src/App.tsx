import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DiscProfileDashboard from './components/DiscProfileDashboard'
import ProgressBadge from './components/ProgressBadge'
import ShareableResultsCard from './components/ShareableResultsCard'
import SocialShareButtons from './components/SocialShareButtons'
import ExecutiveReportDocument from './components/exports/ExecutiveReportDocument'
import { useExportReport } from './hooks/useExportReport'
import { submitDiscScore } from './lib/discApi'
import { buildOgImageUrl, buildShareUrl, buildShareText, trackShareEvent, getSignatureLeadershipStyle } from './lib/share'
import type { DiscScoreResponse, TraitKey } from './types/disc'

const languages = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
]

function LanguageSwitcher({ current, onChange, ariaLabel }: { current: string; onChange: (locale: string) => void; ariaLabel?: string }) {
  return (
    <select
      value={current}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-full border border-stone-200 bg-white/90 px-3 py-1 text-sm text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
      aria-label={ariaLabel}
    >
      {languages.map((language) => (
        <option key={language.code} value={language.code}>
          {language.label}
        </option>
      ))}
    </select>
  )
}

// Questions are now provided via i18n resources (quiz.questions)

const STORAGE_KEY = 'disc-wellness-progress'

type PersistedProgress = {
  step: number
  answers: string[]
  selected: string | null
  showResults: boolean
  started: boolean
  profile: DiscScoreResponse['profile'] | null
  apiError: string | null
  isScoring: boolean
}

const readPersistedProgress = (): PersistedProgress | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    return null
  }

  try {
    const parsed = JSON.parse(saved) as Partial<PersistedProgress>
    return {
      step: typeof parsed.step === 'number' ? parsed.step : 0,
      answers: Array.isArray(parsed.answers) ? parsed.answers.filter((answer): answer is string => typeof answer === 'string') : [],
      selected: typeof parsed.selected === 'string' ? parsed.selected : null,
      showResults: Boolean(parsed.showResults),
      started: Boolean(parsed.started),
      profile: parsed.profile ?? null,
      apiError: typeof parsed.apiError === 'string' ? parsed.apiError : null,
      isScoring: Boolean(parsed.isScoring),
    }
  } catch {
    return null
  }
}

const milestoneMessages = [
  {
    threshold: 25,
    badgeKey: 'milestone.badges.quarter',
    messageKey: 'milestone.messages.quarter',
  },
  {
    threshold: 50,
    badgeKey: 'milestone.badges.halfway',
    messageKey: 'milestone.messages.halfway',
  },
  {
    threshold: 75,
    badgeKey: 'milestone.badges.nearly',
    messageKey: 'milestone.messages.nearly',
  },
] as const

function App() {
  const persistedProgress = readPersistedProgress()
  const [step, setStep] = useState(persistedProgress?.step ?? 0)
  const [answers, setAnswers] = useState<string[]>(persistedProgress?.answers ?? [])
  const [selected, setSelected] = useState<string | null>(persistedProgress?.selected ?? null)
  const [showResults, setShowResults] = useState(persistedProgress?.showResults ?? false)
  const [started, setStarted] = useState(persistedProgress?.started ?? false)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<DiscScoreResponse['profile'] | null>(persistedProgress?.profile ?? null)
  const [apiError, setApiError] = useState<string | null>(persistedProgress?.apiError ?? null)
  const [isScoring, setIsScoring] = useState(persistedProgress?.isScoring ?? false)
  const shareCardRef = useRef<HTMLDivElement | null>(null)
  const reportExportRef = useRef<HTMLDivElement | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const { t, i18n } = useTranslation()
  const nextStepActions = t('nextStep.actions', { returnObjects: true }) as string[]
  const questions = t('quiz.questions', { returnObjects: true }) as Array<{ prompt: string; options: Array<{ label: string; trait: string }> }>
  const language = i18n.resolvedLanguage?.split('-')[0] ?? 'en'
  const prefersReducedMotion = useReducedMotion()
  const { isExporting, exportError: exportReportError, exportReport, generatedAt } = useExportReport({
    profile,
    primaryTrait: (profile?.primaryTrait ?? 'D') as TraitKey,
    secondaryTrait: (profile?.secondaryTrait ?? 'C') as TraitKey,
    completionScore: Math.min(100, Math.round((answers.length / questions.length) * 100)),
    fileName: 'northstar-disc-report',
    language,
  })

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
  const completionPercent = Math.min(100, Math.round(progress))
  const activeMilestone = [...milestoneMessages].reverse().find((item) => completionPercent >= item.threshold) ?? null
  const translatedMilestone = activeMilestone
    ? {
        badge: t(activeMilestone.badgeKey),
        message: t(activeMilestone.messageKey),
      }
    : null

  useEffect(() => {
    if (!showResults) {
      return
    }

    setCelebrate(true)
    const timeout = window.setTimeout(() => setCelebrate(false), 2200)
    return () => window.clearTimeout(timeout)
  }, [showResults])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const hasProgress = started || answers.length > 0 || showResults || profile !== null || apiError !== null || step > 0 || selected !== null || isScoring

    if (!hasProgress) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step,
        answers,
        selected,
        showResults,
        started,
        profile,
        apiError,
        isScoring,
      }))
    } catch {
      // Ignore storage access errors and preserve the in-memory experience.
    }
  }, [answers, apiError, isScoring, profile, selected, showResults, started, step])

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

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t('share.shareTitle'), text: shareText })
        trackShareEvent({ platform: 'linkedin', referralCode, profileSignature: profile ? signature : undefined })
        return
      } catch {
        // fall back to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      trackShareEvent({ platform: 'linkedin', referralCode, profileSignature: profile ? signature : undefined })
      window.setTimeout(() => setCopied(false), 2200)
      return
    } catch {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`,
        '_blank',
        'noopener,noreferrer',
      )
      trackShareEvent({ platform: 'linkedin', referralCode, profileSignature: profile ? signature : undefined })
    }
  }

  const handleDownloadCard = async (format: 'png' | 'pdf' = 'png') => {
    if (!reportExportRef.current) {
      return
    }

    const result = await exportReport(format, reportExportRef.current)
    if (result.ok) {
      trackShareEvent({ platform: format === 'pdf' ? 'linkedin' : 'twitter', referralCode, profileSignature: profile ? signature : undefined })
    }
  }

  const completionScore = Math.min(100, Math.round((answers.length / questions.length) * 100))
  const resultsHeading = profile ? t('quiz.resultHeading', { trait: t(`traits.${primaryTrait}`) }) : t('quiz.resultTitle')
  const streakLabel = answers.length >= questions.length
    ? t('progress.completed')
    : t('progress.streakValue', { answered: answers.length, total: questions.length })
  const shareStatusText = copied ? t('status.saved') : t('status.shareHint')
  const referralCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') ?? undefined : undefined
  const shareUrl = buildShareUrl('linkedin', typeof window !== 'undefined' ? window.location.href : 'https://disc-wellness.app', referralCode)
  const signature = profile ? getSignatureLeadershipStyle(profile.primaryTrait, profile.secondaryTrait).badge : t('app.name')
  const shareText = buildShareText({
    primaryTrait: (profile?.primaryTrait ?? 'D') as 'D' | 'I' | 'S' | 'C',
    secondaryTrait: (profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C',
    url: shareUrl,
    referralCode,
    copyTemplate: t('share.copy', {
      badge: signature,
      traits: `${(profile?.primaryTrait ?? 'D') as 'D' | 'I' | 'S' | 'C'}${(profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C'}`,
      url: shareUrl,
    }),
  })
  const confettiPieces = Array.from({ length: 10 }, (_, index) => ({
    id: index,
    left: `${8 + index * 8}%`,
    delay: index * 0.04,
    color: ['#c78e69', '#8b5e3c', '#d8b08b', '#7c6c5f'][index % 4],
  }))

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const signature = profile ? getSignatureLeadershipStyle(profile.primaryTrait, profile.secondaryTrait).badge : t('app.name')
    const ogImageUrl = buildOgImageUrl(signature, referralCode)

    document.title = `${signature} • ${t('app.name')}`

    const descriptionMeta = document.querySelector('meta[name="description"]')
    if (descriptionMeta) {
      descriptionMeta.setAttribute('content', `${signature}. ${t('app.description')}`)
    }

    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', `${signature} • ${t('app.name')}`)
    }

    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription) {
      ogDescription.setAttribute('content', `${signature}. ${t('app.description')}`)
    }

    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) {
      ogImage.setAttribute('content', ogImageUrl)
    }

    const twitterImage = document.querySelector('meta[name="twitter:image"]')
    if (twitterImage) {
      twitterImage.setAttribute('content', ogImageUrl)
    }
  }, [profile, referralCode])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe9,_#fcfaf7_60%,_#f4ebe3)] text-stone-700">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between rounded-full border border-stone-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-[linear-gradient(135deg,_#f5ede4,_#e9d9c9)] text-sm font-semibold tracking-[0.25em] text-stone-700">
              ND
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">{t('app.name')}</p>
              <h1 className="text-lg font-semibold text-stone-800">{t('app.tagline')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600">
              {t('header.questionsInfo')}
            </div>
            <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600">
              {showResults ? t('header.statusResults') : started ? t('header.statusStep', { current: step + 1, total: questions.length }) : t('header.statusLaunch')}
            </div>
            <LanguageSwitcher current={language} onChange={(value) => i18n.changeLanguage(value)} ariaLabel={t('header.languageLabel')} />
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
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('app.name')}</p>
                    <h2 className="text-3xl font-semibold leading-tight text-stone-800 sm:text-4xl">{t('app.tagline')}</h2>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">{t('app.description')}</p>
                <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-medium text-stone-800">{t('launch.why')}</p>
                  <p className="mt-2">{t('launch.summary')}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.button
                    type="button"
                    onClick={startReflection}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
                  >
                    {t('launch.cta')}
                  </motion.button>

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
                <div className="mb-4 rounded-full border border-stone-200/80 bg-[linear-gradient(180deg,_#fcfaf7,_#f4ebdf)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="relative h-3 overflow-hidden rounded-full bg-stone-200/80">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,_#c78e69,_#9b6b4e,_#7c4f33)]"
                      animate={{ width: `${Math.max(4, progress)}%` }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-white/40"
                      animate={{ width: `${Math.max(4, progress)}%` }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <ProgressBadge label={t('progress.flow')} value={`${completionPercent}%`} />
                    <ProgressBadge label={t('progress.streak')} value={streakLabel} />
                  </div>
                  {translatedMilestone ? (
                    <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 shadow-sm">
                      <span className="font-semibold">{translatedMilestone.badge}</span> • {translatedMilestone.message}
                    </div>
                  ) : null}
                </div>
                <p className="mb-2 text-sm text-stone-500">{t('launch.intro')}</p>
                <h2 className="mb-2 text-2xl font-semibold leading-tight text-stone-800 sm:text-3xl">
                  {t('launch.subtitle')}
                </h2>
                <p className="mb-4 text-sm leading-7 text-stone-600">{t('launch.note')}</p>
                <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-medium text-stone-800">{t('quiz.questionLabel')}</p>
                  <p className="mt-1">{currentQuestion.prompt}</p>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.prompt}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="grid gap-3"
                  >
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
                  </motion.div>
                </AnimatePresence>
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
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-x-0 top-8 mx-auto w-[min(88%,_18rem)] rounded-full border border-stone-200/80 bg-white/85 px-4 py-2 text-center text-sm font-semibold text-stone-700 shadow-[0_10px_30px_-12px_rgba(84,56,45,0.45)] backdrop-blur"
                    >
                      {t('results.completeHeading')}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: [0, 1, 0], y: [0, 24, 42] }}
                      transition={{ duration: 1.6, ease: 'easeOut' }}
                      className="absolute inset-x-0 top-20 mx-auto w-fit rounded-full border border-stone-200/70 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-600 shadow-sm"
                    >
                      {t('results.insightsReady')}
                    </motion.div>
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
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('quiz.resultTitle')}</p>
                    <h2 className="mt-2 text-3xl font-semibold text-stone-800">{resultsHeading}</h2>
                    <p className="mt-3 text-base leading-7 text-stone-600">
                      {profile
                        ? `${t(`traitMeta.${profile.primaryTrait}.summary`)} ${t('dashboard.secondaryNarrative', {
                            secondary: t(`traits.${profile.secondaryTrait}`).toLowerCase(),
                          })}`
                        : t('quiz.resultPlaceholder')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ProgressBadge label={t('progress.completion')} value={`${completionScore}%`} />
                    <ProgressBadge label={t('progress.focus')} value={profile ? t(`traits.${primaryTrait}`) : t('status.scoring')} />
                  </div>
                </div>
              </motion.div>

              <div className="space-y-4">
                <div className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-4 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('share.sectionTitle')}</p>
                      <h3 className="mt-2 text-xl font-semibold text-stone-800">{t('share.sectionSubtitle')}</h3>
                    </div>
                    <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700">
                      {t('share.badgeReady')}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <SocialShareButtons shareText={shareText} />
                  </div>
                </div>

                <DiscProfileDashboard
                  profile={profile}
                  completionScore={completionScore}
                  primaryTrait={primaryTrait as 'D' | 'I' | 'S' | 'C'}
                  secondaryTrait={(profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C'}
                />

                <div ref={shareCardRef}>
                  <ShareableResultsCard
                    profile={profile}
                    primaryTrait={(profile?.primaryTrait ?? 'D') as 'D' | 'I' | 'S' | 'C'}
                    secondaryTrait={(profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C'}
                  />
                </div>

                <div ref={reportExportRef} className="fixed left-[-9999px] top-0 z-[-1] w-[900px] bg-transparent" aria-hidden="true">
                  <ExecutiveReportDocument
                    profile={profile}
                    primaryTrait={(profile?.primaryTrait ?? 'D') as TraitKey}
                    secondaryTrait={(profile?.secondaryTrait ?? 'C') as TraitKey}
                    completionScore={completionScore}
                    generatedAt={generatedAt}
                  />
                </div>
              </div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.06 }}
                className="rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(135deg,_#f9f3ec,_#f3e4d8)] p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] sm:p-6"
              >
                <div className="mb-4 rounded-2xl border border-stone-200/80 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{t('milestone.title')}</p>
                  <p className="mt-2 text-sm font-medium text-stone-800">{t('milestone.body')}</p>
                </div>
                <div className="rounded-[1.5rem] border border-stone-200 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-[linear-gradient(135deg,_#f7eee5,_#e4d0bc)] text-sm font-semibold tracking-[0.25em] text-stone-700">
                        ND
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{t('export.title')}</p>
                        <p className="text-sm font-semibold text-stone-800">{t('export.cardSubtitle', { appName: t('app.name') })}</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white">
                      {t('export.shareReady')}
                    </div>
                  </div>
                  <div className="mt-4 rounded-[1.25rem] border border-stone-200 bg-[linear-gradient(135deg,_#f9f2eb,_#f1e5d8)] p-4">
                    <p className="text-sm leading-7 text-stone-700">{t('export.body')}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-sm font-medium text-stone-700">
                        {t('export.primaryStyle', { style: t(`traits.${primaryTrait}`) })}
                      </span>
                      <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-sm font-medium text-stone-700">
                        {t('export.shareReady')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('export.sectionTitle')}</p>
                    <p className="mt-2 text-lg font-semibold text-stone-800">{t('export.sectionHeading')}</p>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{profile ? t('export.sectionBody') : t('export.waitingBody')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ProgressBadge label={t('progress.share')} value={t('progress.ready')} />
                      <ProgressBadge label={t('progress.brand')} value={t('app.name')} />
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
                        {copied ? t('share.copiedButton') : t('share.copyButton')}
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleDownloadCard('pdf')}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={isExporting}
                        className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isExporting ? t('export.preparingExport') : t('export.downloadPdf')}
                      </motion.button>
                    </div>
                    <motion.p
                      className="text-xs text-stone-500"
                      animate={copied ? { opacity: 1, y: 0 } : { opacity: 0.9, y: 0 }}
                      transition={{ duration: 0.2 }}
                      aria-live="polite"
                    >
                      {exportReportError ? exportReportError : shareStatusText}
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
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('nextStep.title')}</p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-800">{t('nextStep.heading')}</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{t('nextStep.intro')}</p>
                    <ul className="mt-4 space-y-2 text-sm text-stone-700">
                      {nextStepActions.map((action) => (
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
                className="rounded-[2rem] border border-stone-200/80 bg-gradient-to-br from-white via-[#f8f3ec] to-[#f3e7da] p-6 shadow-[0_28px_80px_-36px_rgba(84,56,45,0.36)] sm:p-7"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('support.title')}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-stone-900">{t('support.heading')}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">{t('support.body')}</p>
                    <p className="mt-4 text-sm leading-7 text-stone-700">{t('support.series', { name: t('header.followLinkedIn') })} <a href="https://www.linkedin.com/in/joaocosta1695/" target="_blank" rel="noreferrer" className="font-semibold text-stone-900 underline">{t('support.linkText')}</a>.</p>
                    <p className="mt-3 text-sm text-stone-500">{t('support.note')}</p>
                  </div>
                  <a
                    href="https://www.buymeacoffee.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-200/60 transition hover:bg-stone-800"
                  >
                    {t('support.button')}
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
                  {t('buttons.backToIntro')}
                </motion.button>
                {apiError ? <p className="text-sm text-stone-500">{apiError}</p> : null}
                {isScoring ? <p className="text-sm text-stone-500">{t('status.scoring')}</p> : null}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App

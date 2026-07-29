import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LandingPage from './components/LandingPage'
import ProgressBadge from './components/ProgressBadge'
import ShareableResultsCard from './components/ShareableResultsCard'
import SocialShareButtons from './components/SocialShareButtons'
import ConsentBanner from './components/ConsentBanner'
import PrivacyModal from './components/PrivacyModal'
import ExecutivePaywallModal from './components/ExecutivePaywallModal'
import { useExportReport } from './hooks/useExportReport'
import { submitDiscScore } from './lib/discApi'
import {
  buildEmailShareBody,
  buildEmailShareSubject,
  buildOgImageUrl,
  buildShareUrl,
  buildShareText,
  buildSocialShareCopy,
  trackShareEvent,
  getSignatureLeadershipStyle,
} from './lib/share'
import { generateSocialCardImage } from './services/export'
import { downloadExecutivePdf } from './services/export/executivePdf'
import { downloadFreePdf } from './services/export/freePdf'
import { getStoredExecutivePurchase, startExecutiveCheckout, verifyExecutivePurchase } from './lib/payments'
import { defaultPageTitle, defaultPageDescription, defaultOgImage, parseProfileCode } from './lib/seo'
import type { DiscScoreResponse, TraitKey } from './types/disc'

const DiscProfileDashboard = lazy(() => import('./components/DiscProfileDashboard'))
const TeamDashboard = lazy(() => import('./components/TeamDashboard'))
const ExecutiveReportDocument = lazy(() => import('./components/exports/ExecutiveReportDocument'))

const languages = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
]

function LanguageSwitcher({ current, onChange, ariaLabel }: { current: string; onChange: (locale: string) => void; ariaLabel?: string }) {
  return (
    <select
      value={current}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-full border border-stone-200 bg-white/90 px-3 py-2 text-sm text-stone-700 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
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
const CONSENT_STORAGE_KEY = 'disc-wellness-consent'

const serializeConsent = (choice: 'essential' | 'all') => JSON.stringify({ preference: choice, analytics: choice === 'all' })

const readStoredConsent = (): 'undecided' | 'essential' | 'all' => {
  if (typeof window === 'undefined') {
    return 'undecided'
  }

  const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
  if (!stored) {
    return 'undecided'
  }

  if (stored === 'essential' || stored === 'all') {
    return stored
  }

  try {
    const parsed = JSON.parse(stored) as { preference?: string; analytics?: boolean }
    return parsed.preference === 'essential' || parsed.preference === 'all' ? parsed.preference : 'undecided'
  } catch {
    return stored.includes('analytics') ? 'all' : 'undecided'
  }
}

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
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(null)
  const [submissionAttempts, setSubmissionAttempts] = useState(0)
  const [resumeNotice, setResumeNotice] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [isShareLoading, setIsShareLoading] = useState(false)
  const [isExecutivePdfGenerating, setIsExecutivePdfGenerating] = useState(false)
  const [reportName, setReportName] = useState('')
  const [executivePaywallOpen, setExecutivePaywallOpen] = useState(false)
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [executiveUnlocked, setExecutiveUnlocked] = useState(false)
  const [pendingExecutiveDownload, setPendingExecutiveDownload] = useState(false)
  const [consent, setConsent] = useState<'undecided' | 'essential' | 'all'>(readStoredConsent)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)
  const shareCardRef = useRef<HTMLDivElement | null>(null)
  const reportExportRef = useRef<HTMLDivElement | null>(null)
  const shareModalCloseRef = useRef<HTMLButtonElement | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const { t, i18n } = useTranslation()
  const nextStepActions = t('nextStep.actions', { returnObjects: true }) as string[]
  const audienceCards = t('resultsAudience.cards', { returnObjects: true }) as Array<{ title: string; body: string }>
  const testimonials = t('resultsAudience.testimonials', { returnObjects: true }) as Array<{ quote: string; author: string }>
  const caseStudies = t('resultsAudience.caseStudies', { returnObjects: true }) as Array<{ headline: string; body: string }>
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
  const hasSavedProgress = Boolean(started || answers.length > 0 || showResults || profile !== null || apiError !== null || step > 0 || selected !== null || isScoring)
  const primaryTrait = profile?.primaryTrait ?? 'D'

  const generateExecutivePdf = async () => {
    if (!profile) return
    setIsExecutivePdfGenerating(true)
    try {
      await downloadExecutivePdf({
        profile,
        primaryTrait: primaryTrait as TraitKey,
        secondaryTrait: (profile.secondaryTrait ?? 'C') as TraitKey,
        candidateName: reportName.trim() || t('pdfReport.defaultName'),
        generatedAt,
        labels: {
          brand: t('app.name'), reportTitle: t('pdfReport.title'), executiveProfile: t('pdfReport.executiveProfile'), generated: t('pdfReport.generated'), primary: t('report.primary'), secondary: t('report.secondary'), profileOverview: t('report.profileOverview'), narrative: t('report.executiveSummary'), narrativeText: t(`traitMeta.${primaryTrait}.summary`), scores: t('pdfReport.scores'), behaviouralInsights: t('pdfReport.behaviouralInsights'), communication: t('dashboard.communicationStyle'), workStyle: t('dashboard.work'), stressTriggers: t('dashboard.underPressure'), growthAreas: t('report.developmentFocus'), actionPlan: t('pdfReport.actionPlan'), actionPlanIntro: t('pdfReport.actionPlanIntro'), notes: t('pdfReport.notes'),
          traitNames: { D: t('traits.D'), I: t('traits.I'), S: t('traits.S'), C: t('traits.C') },
          communicationText: t(`insight.communication${primaryTrait}`), workStyleText: t(`insight.environment${primaryTrait}`), stressText: t(`insight.pressure${primaryTrait}`), growthPoints: t(`profileGrowthPoints.${primaryTrait}`, { returnObjects: true }) as string[], conflictManagement: t('pdfReport.conflictManagement'), coachingRecommendations: t('pdfReport.coachingRecommendations'), conflictText: t(`pdfReport.conflictText.${primaryTrait}`), coachingPoints: t(`pdfReport.coachingPoints.${primaryTrait}`, { returnObjects: true }) as string[],
        },
      })
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : t('pdfReport.error'))
    } finally {
      setIsExecutivePdfGenerating(false)
    }
  }

  const handleExecutivePdfDownload = () => {
    if (executiveUnlocked) {
      void generateExecutivePdf()
      return
    }
    setCheckoutError(null)
    setExecutivePaywallOpen(true)
  }

  const handleExecutiveCheckout = async () => {
    setIsStartingCheckout(true)
    setCheckoutError(null)
    try {
      await startExecutiveCheckout(primaryTrait as TraitKey, (profile?.secondaryTrait ?? 'C') as TraitKey)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : t('paywall.checkoutError'))
      setIsStartingCheckout(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const returnedSession = params.get('pro_session_id')
    const sessionId = returnedSession ?? getStoredExecutivePurchase()
    if (!sessionId) return
    void verifyExecutivePurchase(sessionId).then((paid) => {
      if (!paid) return
      setExecutiveUnlocked(true)
      if (returnedSession) {
        params.delete('pro_session_id')
        window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params.toString()}` : ''}${window.location.hash}`)
        setPendingExecutiveDownload(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!pendingExecutiveDownload || !executiveUnlocked || !profile) return
    setPendingExecutiveDownload(false)
    void generateExecutivePdf()
  }, [executiveUnlocked, pendingExecutiveDownload, profile, generateExecutivePdf])

  const submitAssessment = async (finalAnswers: string[]) => {
    setIsScoring(true)
    setApiError(null)

    try {
      const payload = { answers: finalAnswers.map((answer) => ({ trait: answer as 'D' | 'I' | 'S' | 'C' })) }
      const result = await submitDiscScore(payload)

      if (result.success) {
        setProfile(result.profile)
        setShowResults(true)
        setReviewMode(false)
        setSubmissionAttempts(0)
        return
      }

      throw new Error(result.error)
    } catch (error) {
      const nextAttempt = submissionAttempts + 1
      setSubmissionAttempts(nextAttempt)
      if (nextAttempt <= 2) {
        setApiError('The scoring service is taking a moment. Retrying automatically…')
        const fallbackResult = await submitDiscScore({ answers: finalAnswers.map((answer) => ({ trait: answer as 'D' | 'I' | 'S' | 'C' })) })
        if (fallbackResult.success) {
          setProfile(fallbackResult.profile)
          setShowResults(true)
          setReviewMode(false)
          setSubmissionAttempts(0)
          return
        }
        setApiError(error instanceof Error ? error.message : 'Unable to score your results right now.')
      } else {
        setApiError(error instanceof Error ? error.message : 'Unable to score your results right now.')
      }
      setShowResults(false)
    } finally {
      setIsScoring(false)
    }
  }

  const handleQuestionAnswer = async (trait: string, replaceIndex?: number) => {
    setSelected(trait)

    if (typeof replaceIndex === 'number') {
      const updatedAnswers = [...answers]
      updatedAnswers[replaceIndex] = trait
      setAnswers(updatedAnswers)
      setEditingAnswerIndex(null)
      setReviewMode(true)
      setSelected(null)
      setApiError(null)
      return
    }

    const nextAnswers = [...answers, trait]
    setAnswers(nextAnswers)

    if (step < questions.length - 1) {
      setTimeout(() => {
        setStep(step + 1)
        setSelected(null)
      }, 220)
      return
    }

    setReviewMode(true)
    setSelected(null)
  }

  const handleSelect = async (trait: string) => {
    await handleQuestionAnswer(trait)
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
    if (!shareStatus) {
      return
    }

    const timeout = window.setTimeout(() => setShareStatus(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [shareStatus])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent === 'undecided' ? JSON.stringify({ preference: 'essential', analytics: false }) : serializeConsent(consent))
  }, [consent])

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
    setResumeNotice(null)
  }

  const resumeAssessment = () => {
    setStarted(true)
    setResumeNotice('Your saved progress is ready to continue.')
    setShowResults(false)
  }

  const goToIntro = () => {
    setStep(0)
    setAnswers([])
    setSelected(null)
    setShowResults(false)
    setStarted(false)
    setProfile(null)
    setApiError(null)
    setReviewMode(false)
    setSubmissionAttempts(0)
    setResumeNotice(null)

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleConsentChoice = (choice: 'essential' | 'all') => {
    setConsent(choice)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(choice))
    }
  }

  const handleEditAnswer = (index: number) => {
    setEditingAnswerIndex(index)
    setStep(index)
    setReviewMode(false)
    setSelected(null)
    setApiError(null)
  }

  const handleClearAssessmentData = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem('disc-wellness.share-analytics')
    }

    goToIntro()
    setShareStatus('Your assessment data has been cleared from this browser.')
  }

  const handleExportRawData = () => {
    if (typeof window === 'undefined') {
      return
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      consent,
      assessment: {
        step,
        answers,
        selected,
        showResults,
        started,
        profile,
        apiError,
        isScoring,
      },
      analytics: typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('disc-wellness.share-analytics') ?? 'null') : null,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'northstar-disc-raw-data.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    setShareStatus('Your raw DISC data was exported as JSON.')
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
    if (format === 'pdf') {
      if (!profile) return
      try {
        await downloadFreePdf({
          profile,
          primaryTrait: primaryTrait as TraitKey,
          secondaryTrait: (profile.secondaryTrait ?? 'C') as TraitKey,
          generatedAt,
          labels: { brand: t('app.name'), title: t('freePdf.title'), summary: t('freePdf.summary'), strengths: t('dashboard.coreStrengths'), generated: t('pdfReport.generated'), traitNames: { D: t('traits.D'), I: t('traits.I'), S: t('traits.S'), C: t('traits.C') }, narrative: t(`traitMeta.${primaryTrait}.summary`), highlights: t(`traitMeta.${primaryTrait}.strengths`, { returnObjects: true }) as string[] },
        })
      } catch (error) {
        setShareStatus(error instanceof Error ? error.message : t('freePdf.error'))
      }
      return
    }
    if (!reportExportRef.current) {
      return
    }

    const result = await exportReport(format, reportExportRef.current)
    if (result.ok) {
      trackShareEvent({ platform: 'twitter', referralCode, profileSignature: profile ? signature : undefined })
    }
  }

  const completionScore = Math.min(100, Math.round((answers.length / questions.length) * 100))
  const resultsHeading = profile ? t('quiz.resultHeading', { trait: t(`traits.${primaryTrait}`) }) : t('quiz.resultTitle')
  const streakLabel = answers.length >= questions.length
    ? t('progress.completed')
    : t('progress.streakValue', { answered: answers.length, total: questions.length })
  const shareStatusText = copied ? t('status.saved') : t('status.shareHint')
  const urlSearchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const referralCode = urlSearchParams.get('ref') ?? undefined
  const profileQuery = urlSearchParams.get('profile') ?? undefined
  const sharedProfile = parseProfileCode(profileQuery)
  const inferredProfileCode = profile ? `${profile.primaryTrait}${profile.secondaryTrait}` : sharedProfile ? `${sharedProfile.primaryTrait}${sharedProfile.secondaryTrait}` : undefined
  const shareUrl = buildShareUrl(typeof window !== 'undefined' ? window.location.href : 'https://disc-wellness.app', referralCode, inferredProfileCode)
  const signature = profile ? getSignatureLeadershipStyle(profile.primaryTrait, profile.secondaryTrait).badge : (sharedProfile ? getSignatureLeadershipStyle(sharedProfile.primaryTrait, sharedProfile.secondaryTrait).badge : t('app.name'))
  const shareText = buildShareText({
    primaryTrait: (profile?.primaryTrait ?? sharedProfile?.primaryTrait ?? 'D') as 'D' | 'I' | 'S' | 'C',
    secondaryTrait: (profile?.secondaryTrait ?? sharedProfile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C',
    url: shareUrl,
    referralCode,
    profileCode: inferredProfileCode,
    copyTemplate: t('share.copy', {
      badge: signature,
      traits: `${(profile?.primaryTrait ?? sharedProfile?.primaryTrait ?? 'D') as 'D' | 'I' | 'S' | 'C'}${(profile?.secondaryTrait ?? sharedProfile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C'}`,
      url: shareUrl,
    }),
  })
  const socialShareCopy = buildSocialShareCopy({
    primaryTrait: (profile?.primaryTrait ?? sharedProfile?.primaryTrait ?? 'D') as TraitKey,
    secondaryTrait: (profile?.secondaryTrait ?? sharedProfile?.secondaryTrait ?? 'C') as TraitKey,
    url: 'https://northstar-disc.vercel.app',
    referralCode,
    profileCode: inferredProfileCode,
    language,
  })
  const confettiPieces = Array.from({ length: 10 }, (_, index) => ({
    id: index,
    left: `${8 + index * 8}%`,
    delay: index * 0.04,
    color: ['#c78e69', '#8b5e3c', '#d8b08b', '#7c6c5f'][index % 4],
  }))

  const handleSocialShare = async (platform: 'linkedin' | 'twitter' | 'email') => {
    if (!profile) {
      return
    }

    setIsShareLoading(true)
    setShareStatus(null)
    const sharePageUrl = buildShareUrl(typeof window !== 'undefined' ? window.location.href : 'https://northstar-disc.vercel.app', referralCode)
    const textCopy = socialShareCopy
    const emailSubject = buildEmailShareSubject(profile.primaryTrait, profile.secondaryTrait)
    const emailBody = buildEmailShareBody({
      primaryTrait: profile.primaryTrait,
      secondaryTrait: profile.secondaryTrait,
      url: sharePageUrl,
      referralCode,
      copyTemplate: textCopy,
    })

    if (platform === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, '_blank', 'noopener,noreferrer')
      setShareStatus(t('share.toastShareSuccess'))
      trackShareEvent({ platform, referralCode, profileSignature: signature })
      setIsShareLoading(false)
      return
    }

    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: t('share.shareTitle'),
          text: textCopy,
          url: sharePageUrl,
        })
        setShareStatus(t('share.toastShareSuccess'))
        trackShareEvent({ platform, referralCode, profileSignature: signature })
        setIsShareLoading(false)
        return
      } catch {
        // Fall back to the custom share modal for desktop and unsupported browsers.
      }
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textCopy)
      }
    } catch {
      // Continue anyway if clipboard text copy fails.
    }

    try {
      const imageBlob = await generateSocialCardImage({
        primaryTrait: (profile.primaryTrait ?? 'D') as TraitKey,
        secondaryTrait: (profile.secondaryTrait ?? 'C') as TraitKey,
        profile,
        url: 'https://northstar-disc.vercel.app',
        referralCode,
        language,
      })

      const downloadLink = document.createElement('a')
      const imageUrl = URL.createObjectURL(imageBlob)
      downloadLink.href = imageUrl
      downloadLink.download = 'Northstar_DISC_Profile.png'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      window.setTimeout(() => URL.revokeObjectURL(imageUrl), 1500)

      if (navigator.clipboard && typeof (window as any).ClipboardItem === 'function') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })])
        } catch {
          // ignore clipboard image fallback failures.
        }
      }
    } catch (error) {
      console.warn('Premium share image generation failed:', error)
    }

    setShareModalOpen(true)
    setIsShareLoading(false)
  }

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const signature = profile ? getSignatureLeadershipStyle(profile.primaryTrait, profile.secondaryTrait).badge : (sharedProfile ? getSignatureLeadershipStyle(sharedProfile.primaryTrait, sharedProfile.secondaryTrait).badge : t('app.name'))
    const pageTitle = profile ? `${signature} • ${t('app.name')}` : defaultPageTitle
    const pageDescription = profile ? `${signature}. ${t('app.description')}` : defaultPageDescription
    const ogImageUrl = profile ? buildOgImageUrl(signature, referralCode) : defaultOgImage

    document.title = pageTitle

    const descriptionMeta = document.querySelector('meta[name="description"]')
    if (descriptionMeta) {
      descriptionMeta.setAttribute('content', pageDescription)
    }

    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', pageTitle)
    }

    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription) {
      ogDescription.setAttribute('content', pageDescription)
    }

    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) {
      ogUrl.setAttribute('content', shareUrl)
    }

    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) {
      ogImage.setAttribute('content', ogImageUrl)
    }

    const twitterTitle = document.querySelector('meta[name="twitter:title"]')
    if (twitterTitle) {
      twitterTitle.setAttribute('content', pageTitle)
    }

    const twitterDescription = document.querySelector('meta[name="twitter:description"]')
    if (twitterDescription) {
      twitterDescription.setAttribute('content', pageDescription)
    }

    const twitterImage = document.querySelector('meta[name="twitter:image"]')
    if (twitterImage) {
      twitterImage.setAttribute('content', ogImageUrl)
    }
  }, [profile, referralCode, sharedProfile, shareUrl, t])

  useEffect(() => {
    if (!shareModalOpen) return

    shareModalCloseRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShareModalOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [shareModalOpen])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#f8efe9,_#fcfaf7_60%,_#f4ebe3)] text-stone-700">
      <ConsentBanner consent={consent} onAcceptAll={() => handleConsentChoice('all')} onEssentialOnly={() => handleConsentChoice('essential')} />
      <PrivacyModal open={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} consent={consent} onConsentChange={handleConsentChoice} onClearData={handleClearAssessmentData} onExportData={handleExportRawData} />
      <ExecutivePaywallModal open={executivePaywallOpen} onClose={() => setExecutivePaywallOpen(false)} onCheckout={handleExecutiveCheckout} isStartingCheckout={isStartingCheckout} error={checkoutError} />
      {shareModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/60 px-3 py-4 backdrop-blur-sm sm:px-6" role="dialog" aria-modal="true" aria-labelledby="share-modal-title" aria-describedby="share-modal-description">
          <div className="executive-card my-auto w-full max-w-md p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-stone-500">{t('share.modal.eyebrow')}</p>
                <h3 id="share-modal-title" className="mt-2 text-xl font-semibold text-stone-900">{t('share.modal.title')}</h3>
              </div>
              <button ref={shareModalCloseRef} type="button" onClick={() => setShareModalOpen(false)} className="executive-button focus-ring border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50">{t('share.modal.close')}</button>
            </div>
            <p id="share-modal-description" className="mt-3 text-sm leading-7 text-stone-600">{t('share.modal.description')}</p>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => { setShareModalOpen(false); void handleSocialShare('linkedin') }} className="focus-ring flex min-h-12 w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-white">{t('share.buttonLinkedIn')} <span aria-hidden="true">↗</span></button>
              <button type="button" onClick={() => { setShareModalOpen(false); void handleSocialShare('twitter') }} className="focus-ring flex min-h-12 w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-white">{t('share.buttonX')} <span aria-hidden="true">↗</span></button>
              <button type="button" onClick={() => { setShareModalOpen(false); void handleSocialShare('email') }} className="focus-ring flex min-h-12 w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-white">{t('share.buttonEmail')} <span aria-hidden="true">↗</span></button>
            </div>
          </div>
        </div>
      ) : null}
      <main className="page-shell flex min-h-screen flex-col py-4 sm:py-6">
        <header className="mb-4 flex flex-col gap-3 rounded-[2rem] border border-stone-200/70 bg-white/70 px-4 py-3 shadow-[0_18px_45px_-24px_rgba(84,56,45,0.3)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white/95 p-1 shadow-sm">
              <img src="/LOGO.png" alt="NorthStar mark" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-[11px] uppercase tracking-[0.3em] text-stone-500">NorthStar DISC</span>
              <span className="text-lg font-semibold text-stone-800">{t('app.tagline')}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-600">
              {t('header.questionsInfo')}
            </div>
            <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-600">
              {showResults ? t('header.statusResults') : started ? t('header.statusStep', { current: step + 1, total: questions.length }) : t('header.statusLaunch')}
            </div>
            <LanguageSwitcher current={language} onChange={(value) => i18n.changeLanguage(value)} ariaLabel={t('header.languageLabel')} />
          </div>
        </header>

        <AnimatePresence mode="sync">
          {!started && !showResults ? (
            <LandingPage onStart={startReflection} hasSavedProgress={hasSavedProgress} onResume={resumeAssessment} />
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
                {resumeNotice ? (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {resumeNotice}
                  </div>
                ) : null}
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
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <div>
                    <p className="font-medium text-stone-800">{reviewMode ? 'Review your responses' : t('launch.intro')}</p>
                    <p className="mt-1 text-stone-600">{reviewMode ? 'You can revise earlier answers before you submit your final profile.' : `${step + 1} of ${questions.length} questions`}</p>
                  </div>
                  <div className="rounded-full border border-stone-300 bg-white px-3 py-2 font-semibold text-stone-700">
                    {reviewMode ? 'Review' : `Question ${step + 1} of ${questions.length}`}
                  </div>
                </div>
                <p className="mb-2 text-sm text-stone-500">{t('launch.subtitle')}</p>
                <h2 className="mb-2 text-2xl font-semibold leading-tight text-stone-800 sm:text-3xl">
                  {t('launch.subtitle')}
                </h2>
                <p className="mb-4 text-sm leading-7 text-stone-600">{t('launch.note')}</p>
                <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-medium text-stone-800">{t('quiz.questionLabel')}</p>
                  <p className="mt-1">{reviewMode ? 'Review your responses before final submission.' : currentQuestion.prompt}</p>
                </div>
                {reviewMode ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                      <p className="font-medium text-stone-800">Selected answers</p>
                      <div className="mt-3 space-y-2">
                        {answers.map((answer, index) => (
                          <div key={`${answer}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2">
                            <span className="text-sm text-stone-700">{questions[index]?.prompt ?? `Question ${index + 1}`}</span>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">Response saved</span>
                              <button type="button" onClick={() => handleEditAnswer(index)} className="text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">Edit</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => setReviewMode(false)} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2">Back to questions</button>
                      <button type="button" onClick={() => submitAssessment(answers)} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2">Submit assessment</button>
                    </div>
                  </div>
                ) : editingAnswerIndex !== null ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${editingAnswerIndex}-${currentQuestion.prompt}`}
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
                          onClick={() => handleQuestionAnswer(option.trait, editingAnswerIndex)}
                          whileHover={{ y: -2, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 ${
                            answers[editingAnswerIndex] === option.trait
                              ? 'border-stone-600 bg-stone-900 text-white shadow-lg'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-white'
                          }`}
                        >
                          {option.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                ) : (
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
                )}
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
                      {t('quiz.results.completeHeading')}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: [0, 1, 0], y: [0, 24, 42] }}
                      transition={{ duration: 1.6, ease: 'easeOut' }}
                      className="absolute inset-x-0 top-20 mx-auto w-fit rounded-full border border-stone-200/70 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-600 shadow-sm"
                    >
                      {t('quiz.results.insightsReady')}
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
                  <div className="space-y-3">
                    {shareStatus ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                        {shareStatus}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <SocialShareButtons shareText={socialShareCopy} onShare={handleSocialShare} disabled={isShareLoading} />
                    </div>
                  </div>
                </div>

                <Suspense fallback={<div className="h-80 animate-pulse rounded-[2rem] bg-stone-100" aria-label="Loading profile dashboard" />}>
                  <DiscProfileDashboard
                    profile={profile}
                    completionScore={completionScore}
                    primaryTrait={primaryTrait as 'D' | 'I' | 'S' | 'C'}
                    secondaryTrait={(profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C'}
                  />
                </Suspense>

                <section className="print-hide mt-5 rounded-[2rem] border border-[#dcc9b7] bg-[linear-gradient(135deg,_#fffaf5,_#f1e2d3)] p-5 shadow-[0_20px_50px_-30px_rgba(84,56,45,0.35)] sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500"><span className="mr-2 rounded-full bg-stone-900 px-2 py-1 text-[10px] text-white">{t('paywall.badge')}</span>{t('pdfReport.eyebrow')}</p>
                      <h3 className="mt-2 text-xl font-semibold text-stone-800">{t('pdfReport.title')}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">{t('pdfReport.description')}</p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-72">
                      <input value={reportName} onChange={(event) => setReportName(event.target.value)} placeholder={t('pdfReport.namePlaceholder')} className="rounded-xl border border-stone-200 bg-white/85 px-3 py-2 text-sm text-stone-700" />
                      <button type="button" onClick={handleExecutivePdfDownload} disabled={isExecutivePdfGenerating || !profile} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60">
                        {isExecutivePdfGenerating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
                        {isExecutivePdfGenerating ? t('pdfReport.generating') : executiveUnlocked ? t('pdfReport.downloadUnlocked') : t('pdfReport.download')}
                      </button>
                    </div>
                  </div>
                </section>

                <Suspense fallback={<div className="mt-5 h-64 animate-pulse rounded-[2rem] bg-stone-100" aria-label="Loading team dashboard" />}>
                  <TeamDashboard currentProfile={profile} />
                </Suspense>

                <div ref={shareCardRef}>
                  <ShareableResultsCard
                    profile={profile}
                    primaryTrait={(profile?.primaryTrait ?? 'D') as 'D' | 'I' | 'S' | 'C'}
                    secondaryTrait={(profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C'}
                  />
                </div>

                <div ref={reportExportRef} className="fixed left-[-9999px] top-0 z-[-1] w-[900px] bg-transparent" aria-hidden="true">
                  <Suspense fallback={null}>
                    <ExecutiveReportDocument
                      profile={profile}
                      primaryTrait={(profile?.primaryTrait ?? 'D') as TraitKey}
                      secondaryTrait={(profile?.secondaryTrait ?? 'C') as TraitKey}
                      completionScore={completionScore}
                      generatedAt={generatedAt}
                    />
                  </Suspense>
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
                        {isExporting ? t('export.preparingExport') : <><span className="mr-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">{t('freePdf.badge')}</span>{t('freePdf.download')}</>}
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
                className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] sm:p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {audienceCards.map((variant) => (
                    <div key={variant.title} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{variant.title}</p>
                      <p className="mt-3 text-sm leading-7 text-stone-700">{variant.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {testimonials.map((item) => (
                    <div key={item.author} className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
                      <p className="text-sm italic leading-7 text-stone-700">“{item.quote}”</p>
                      <p className="mt-4 text-sm font-semibold text-stone-900">{item.author}</p>
                    </div>
                  ))}
                  {caseStudies.map((item) => (
                    <div key={item.headline} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
                      <p className="text-sm uppercase tracking-[0.24em] text-stone-500">{item.headline}</p>
                      <p className="mt-3 text-sm leading-7 text-stone-700">{item.body}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

                <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.08 }}
                className="rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(135deg,_#fcf6ed,_#f6e7d4)] p-6 shadow-[0_28px_80px_-36px_rgba(84,56,45,0.32)] sm:p-7"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('support.title')}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-stone-900">{t('support.heading')}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">{t('support.body')}</p>
                    <p className="mt-4 text-sm leading-7 text-stone-700">{t('support.series', { name: t('header.followLinkedIn') })} <a href="https://www.linkedin.com/in/joaocosta1695/" target="_blank" rel="noopener noreferrer" className="font-semibold text-stone-900 underline">{t('support.linkText')}</a>.</p>
                    <p className="mt-3 text-sm text-stone-500">{t('support.note')}</p>
                  </div>
                  <a
                    href="https://donate.stripe.com/fZu00i3aGcR6bZ3gUr0co00"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-200/60 transition hover:bg-stone-800"
                  >
                    <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm text-stone-900">☕</span>
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
      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-stone-200/70 px-3 py-5 text-sm text-stone-600 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl">Northstar DISC respects your privacy and gives you control over your assessment data.</p>
          <button type="button" onClick={() => setPrivacyModalOpen(true)} className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2" aria-label="Privacy & Data Settings">
            Privacy & Data Settings
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App

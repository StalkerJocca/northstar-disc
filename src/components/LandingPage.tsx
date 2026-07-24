import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

type LandingPageProps = {
  onStart: () => void
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const { t } = useTranslation()

  const featureCards = [
    {
      key: 'chart',
      label: t('landing.featureCards.chart.title'),
      description: t('landing.featureCards.chart.body'),
    },
    {
      key: 'insights',
      label: t('landing.featureCards.insights.title'),
      description: t('landing.featureCards.insights.body'),
    },
    {
      key: 'export',
      label: t('landing.featureCards.export.title'),
      description: t('landing.featureCards.export.body'),
    },
    {
      key: 'reflection',
      label: t('landing.featureCards.reflection.title'),
      description: t('landing.featureCards.reflection.body'),
    },
  ]

  const steps = t('landing.steps', { returnObjects: true }) as Array<{ title: string; description: string }>

  const previewTraits = ['D', 'I', 'S', 'C'] as const

  return (
    <section className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_28px_80px_-36px_rgba(84,56,45,0.28)] sm:p-10"
      >
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-4">
              <img src="/NorthStar.png" alt="Northstar DISC Logo" className="w-36 max-w-full rounded-3xl object-contain sm:w-44 lg:w-48" />
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.3em] text-stone-500">NorthStar DISC</p>
                <p className="max-w-md text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
                  {t('landing.headline')}
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
              {t('landing.headline')}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-900 sm:text-5xl">
              {t('landing.subheadline')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
              {t('landing.intro')}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm">
                {t('landing.badges.free')}
              </span>
              <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm">
                {t('landing.badges.noSignup')}
              </span>
              <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm">
                {t('landing.badges.report')}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.button
                type="button"
                onClick={onStart}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-4 text-sm font-semibold text-white transition duration-200 ease-out hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
              >
                {t('landing.ctaPrimary')}
                <span aria-hidden="true" className="text-xl">→</span>
              </motion.button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-[radial-gradient(circle_at_top,_rgba(248,232,216,0.9),_rgba(255,255,255,0.8))] p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-stone-100 via-transparent to-transparent" />
            <div className="relative rounded-[1.75rem] border border-stone-200 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(84,56,45,0.25)]">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{t('landing.previewBadge')}</p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-900">{t('landing.previewTitle')}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{t('landing.previewBody')}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_0.9fr]">
                <div className="relative overflow-hidden rounded-[1.5rem] bg-stone-50 p-4 pt-6 shadow-sm">
                  <div className="absolute inset-x-4 top-4 h-1.5 rounded-full bg-gradient-to-r from-stone-300 via-stone-200 to-stone-300" />
                  <div className="relative mx-auto h-36 w-36 rounded-full border border-stone-200 bg-white shadow-inner">
                    <div className="absolute inset-6 rounded-full border border-stone-300/80 bg-gradient-to-br from-stone-100 to-stone-200" />
                    <div className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-stone-100" />
                  </div>
                  <div className="mt-6 space-y-2 text-sm leading-6 text-stone-700">
                    {previewTraits.map((trait) => (
                      <div key={trait} className="flex items-center justify-between rounded-full bg-white px-3 py-2 shadow-sm">
                        <span>{t(`traits.${trait}`)}</span>
                        <span className="text-xs font-semibold uppercase text-stone-500">{trait}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-white/90 p-4">
                  <div className="rounded-3xl bg-stone-100 px-3 py-2 text-xs uppercase tracking-[0.26em] text-stone-500">
                    {t('landing.previewAction')}
                  </div>
                  <div className="space-y-3 text-sm leading-7 text-stone-600">
                    <p>{t('landing.previewFeature1')}</p>
                    <p>{t('landing.previewFeature2')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
        className="space-y-6"
      >
        <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_18px_50px_-24px_rgba(84,56,45,0.22)] sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('landing.socialProof.title')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(t('landing.socialProof.items', { returnObjects: true }) as string[]).map((item, index) => (
              <div key={index} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_18px_50px_-24px_rgba(84,56,45,0.22)] sm:p-8">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('landing.featureHeading')}</p>
              <p className="mt-3 max-w-xl text-lg font-semibold leading-8 text-stone-900">{t('landing.featureIntro')}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {featureCards.map((card) => (
                <div key={card.key} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 text-sm text-stone-700 shadow-sm">
                  <p className="text-base font-semibold text-stone-900">{card.label}</p>
                  <p className="mt-3 leading-7 text-stone-600">{card.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_18px_50px_-24px_rgba(84,56,45,0.22)] sm:p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('landing.stepsTitle')}</p>
            <p className="mt-3 max-w-lg text-lg font-semibold leading-8 text-stone-900">{t('landing.stepsIntro')}</p>
            <div className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-4 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">{step.title}</p>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.12 }}
        className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-[0_18px_50px_-24px_rgba(84,56,45,0.22)] sm:p-8"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('landing.ctaFooter.title')}</p>
            <p className="mt-2 max-w-2xl text-lg font-semibold leading-8 text-stone-900">{t('landing.ctaFooter.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <motion.button
              type="button"
              onClick={onStart}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-4 text-sm font-semibold text-white transition duration-200 ease-out hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
            >
              {t('landing.ctaPrimary')}
              <span aria-hidden="true" className="text-xl">→</span>
            </motion.button>
            <p className="text-sm text-stone-500">{t('landing.ctaFooter.note')}</p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import {
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { traitMeta } from '../lib/discProfile'
import type { DiscScoreResponse, TraitKey } from '../types/disc'

type DiscProfileDashboardProps = {
  profile: DiscScoreResponse['profile'] | null
  completionScore: number
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
}

const traitColors: Record<TraitKey, string> = {
  D: '#c78e69',
  I: '#d8b24a',
  S: '#688b6a',
  C: '#5d6f7d',
}

export default function DiscProfileDashboard({ profile, completionScore, primaryTrait, secondaryTrait }: DiscProfileDashboardProps) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [activeDynamic, setActiveDynamic] = useState<'communication' | 'environment' | 'leadership' | 'growth'>('communication')
  const [activeScenario, setActiveScenario] = useState<'feedback' | 'conflict' | 'pitch'>('feedback')
  const chartData = (profile?.scores ?? []).map((item) => ({
    trait: item.trait,
    subject: t(`traits.${item.trait}`),
    value: item.percentage,
    fullMark: 100,
  }))

  const traitKpis = (profile?.scores ?? []).map((item) => ({
    trait: item.trait as TraitKey,
    value: item.percentage,
    label: t(`traits.${item.trait}`),
  }))

  // API scoring is language-neutral; visible profile copy always comes from the active locale.
  const profileHighlights = t(`traitMeta.${primaryTrait}.strengths`, { returnObjects: true }) as string[]
  const averageScore = (profile?.scores.reduce((sum, item) => sum + item.percentage, 0) ?? 0) / Math.max(1, profile?.scores.length ?? 4)
  const balancePercentile = Math.min(95, Math.max(15, Math.round((averageScore * 0.82) + ((profile?.scores[0]?.percentage ?? 72) - (profile?.scores[3]?.percentage ?? 42)) * 0.08)))
  const balanceContext = t('dashboard.percentileContext', {
    percentile: `${balancePercentile}th`,
    primary: t(`traits.${primaryTrait}`),
    secondary: t(`traits.${secondaryTrait}`),
  })
  const insightSections = [
    {
      title: t('dashboard.coreStrengths'),
      items: profileHighlights,
    },
    {
      title: t('dashboard.idealEnvironment'),
      items: [t(`insight.environment${primaryTrait}`)],
    },
    {
      title: t('dashboard.underPressure'),
      items: [t(`insight.pressure${primaryTrait}`)],
    },
    {
      title: t('dashboard.communicationStyle'),
      items: [t(`insight.communication${primaryTrait}`)],
    },
  ]
  const behavioralCards = [
    {
      title: t('dashboard.communicationUnderPressure'),
      body: t(`insight.pressure${primaryTrait}`),
    },
    {
      title: t('dashboard.idealWorkEnvironment'),
      body: t(`insight.environment${primaryTrait}`),
    },
    {
      title: t('dashboard.leadershipSuperpowers'),
      body: profileHighlights[0] ?? t(`traitMeta.${primaryTrait}.summary`),
    },
  ]

  const detailedProfile = [
    { key: 'work', label: t('dashboard.work'), value: t(`profileDimensions.${primaryTrait}.work`, { defaultValue: traitMeta[primaryTrait].work }) },
    { key: 'team', label: t('dashboard.team'), value: t(`profileDimensions.${primaryTrait}.team`, { defaultValue: traitMeta[primaryTrait].team }) },
    { key: 'leadership', label: t('dashboard.leadership'), value: t(`profileDimensions.${primaryTrait}.leadership`, { defaultValue: traitMeta[primaryTrait].leadership }) },
    { key: 'life', label: t('dashboard.life'), value: t(`profileDimensions.${primaryTrait}.life`, { defaultValue: traitMeta[primaryTrait].life }) },
  ]

  const narrative = `${t(`traitMeta.${primaryTrait}.summary`)} ${t('dashboard.secondaryNarrative', { secondary: t(`traits.${secondaryTrait}`).toLowerCase() })}`
  const workplaceDynamics = {
    communication: {
      title: t('dashboard.dynamics.communication'),
      items: [
        { label: t('dashboard.dynamics.talkToMe'), value: t(`workplaceDynamics.traits.${primaryTrait}.communication`) },
        { label: t('dashboard.dynamics.stressTriggers'), value: t(`workplaceDynamics.traits.${primaryTrait}.stress`) },
      ],
    },
    environment: {
      title: t('dashboard.dynamics.environment'),
      items: (t(`workplaceDynamics.traits.${primaryTrait}.environment`, { returnObjects: true }) as string[]).map((value) => ({ label: t('dashboard.dynamics.productivityFactor'), value })),
    },
    leadership: {
      title: t('dashboard.dynamics.leadership'),
      items: [
        { label: t('dashboard.dynamics.decisionMaking'), value: t(`workplaceDynamics.traits.${primaryTrait}.decisions`) },
        { label: t('dashboard.dynamics.delegation'), value: t(`workplaceDynamics.traits.${secondaryTrait}.delegation`) },
      ],
    },
    growth: {
      title: t('dashboard.dynamics.growth'),
      items: (t(`workplaceDynamics.traits.${primaryTrait}.growth`, { returnObjects: true }) as string[]).map((value) => ({ label: t('dashboard.dynamics.growthAction'), value })),
    },
  }
  const activeDynamicsContent = workplaceDynamics[activeDynamic]
  const scenarios = ['feedback', 'conflict', 'pitch'] as const

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.35, ease: 'easeOut' }}
        className="executive-card min-w-0 p-4 sm:p-6"
      >
        <div className="executive-panel bg-[linear-gradient(135deg,_#f9f3eb,_#f1e5d8)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{t('dashboard.leaderProfile')}</p>
              <h3 className="mt-2 text-2xl font-semibold text-stone-800">{t('dashboard.profileLine', { primary: t(`traits.${primaryTrait}`), secondary: t(`traits.${secondaryTrait}`).toLowerCase() })}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                {profile ? narrative : `${t(`traitMeta.${primaryTrait}.summary`)} ${t('dashboard.secondaryNarrative', { secondary: t(`traits.${secondaryTrait}`).toLowerCase() })}`}
              </p>
            </div>
            <div className="rounded-full border border-stone-200 bg-white/70 px-3 py-2 text-sm font-medium text-stone-700">
              {t('dashboard.completionLabel', { value: completionScore })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {traitKpis.map((item) => (
              <div key={item.trait} className="rounded-full border border-stone-200 bg-white/75 px-3 py-2 text-sm text-stone-700 shadow-sm">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: traitColors[item.trait] }} />
                <span className="font-medium">{item.label}</span>
                <span className="ml-2 text-stone-500">{item.value}%</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {detailedProfile.map((item) => (
              <div key={item.key} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{item.label}</p>
                <p className="mt-2 leading-7">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 h-64 w-full overflow-hidden rounded-[1.5rem] border border-stone-200 bg-[radial-gradient(circle_at_top,_#fffaf6,_#f8efe8)] p-2 sm:h-80 sm:p-3" role="img" aria-label={t('dashboard.radarChartLabel')}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="78%" data={chartData}>
              <PolarGrid stroke="#d9c5b1" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={({ x, y, payload }) => {
                  const label = payload.value as string
                  const color = label === 'Drive'
                    ? traitColors.D
                    : label === 'Influence'
                      ? traitColors.I
                      : label === 'Steadiness'
                        ? traitColors.S
                        : traitColors.C

                  return (
                    <text x={x} y={y} textAnchor="middle" fill={color} fontSize={12}>
                      {label}
                    </text>
                  )
                }}
              />
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

        <div className="mt-4 flex flex-wrap gap-2">
          {(['D', 'I', 'S', 'C'] as TraitKey[]).map((trait) => (
            <div key={trait} className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: traitColors[trait] }} />
              <span>{t(`traits.${trait}`)}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.35, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.08 }}
        className="min-w-0 space-y-3"
      >
        <div className="rounded-[1.5rem] border border-stone-200/80 bg-[linear-gradient(135deg,_#fffaf4,_#f6ebdf)] p-4 shadow-[0_10px_30px_-20px_rgba(84,56,45,0.35)]">
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{t('dashboard.percentileLabel')}</p>
          <p className="mt-2 text-sm leading-7 text-stone-700">{balanceContext}</p>
        </div>
        {insightSections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.12 + index * 0.08 }}
            className="rounded-[1.5rem] border border-stone-200/80 bg-white/85 p-4 shadow-[0_10px_30px_-20px_rgba(84,56,45,0.35)]"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{section.title}</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-stone-700">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-stone-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
          {behavioralCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.16 + index * 0.06 }}
              className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50 p-4"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{card.title}</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <section className="lg:col-span-2 space-y-4">
        <div className="executive-card p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{t('dashboard.dynamics.eyebrow')}</p>
              <h3 className="mt-2 text-xl font-semibold text-stone-800">{t('dashboard.dynamics.title')}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">{t('dashboard.dynamics.description', { primary: t(`traits.${primaryTrait}`), secondary: t(`traits.${secondaryTrait}`).toLowerCase() })}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={t('dashboard.dynamics.title')}>
            {(Object.keys(workplaceDynamics) as Array<keyof typeof workplaceDynamics>).map((key) => (
              <button key={key} type="button" role="tab" aria-selected={activeDynamic === key} onClick={() => setActiveDynamic(key)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeDynamic === key ? 'bg-stone-800 text-white' : 'border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}>
                {workplaceDynamics[key].title}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2" role="tabpanel">
            {activeDynamicsContent.items.map((item) => (
              <div key={item.value} className="rounded-[1.25rem] border border-stone-200 bg-[linear-gradient(135deg,_#fffaf6,_#f7efe7)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">{item.label}</p>
                <p className="mt-2 text-sm leading-7 text-stone-700">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="executive-card p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{t('dashboard.simulator.eyebrow')}</p>
          <h3 className="mt-2 text-xl font-semibold text-stone-800">{t('dashboard.simulator.title')}</h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">{t('dashboard.simulator.description')}</p>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t('dashboard.simulator.title')}>
            {scenarios.map((scenario) => (
              <button key={scenario} type="button" aria-pressed={activeScenario === scenario} onClick={() => setActiveScenario(scenario)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeScenario === scenario ? 'bg-[#8b5e3c] text-white' : 'border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}>
                {t(`dashboard.simulator.scenarios.${scenario}`)}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-[1.25rem] border border-[#dfcdbd] bg-[#fbf3ea] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{t(`dashboard.simulator.scenarios.${activeScenario}`)}</p>
            <p className="mt-2 text-sm leading-7 text-stone-800">{t(`workplaceDynamics.traits.${primaryTrait}.scenarios.${activeScenario}`)}</p>
            <p className="mt-3 border-t border-[#e5d5c6] pt-3 text-sm leading-7 text-stone-600">{t('dashboard.simulator.secondaryCue', { secondary: t(`traits.${secondaryTrait}`).toLowerCase(), tip: t(`workplaceDynamics.traits.${secondaryTrait}.scenarioCues.${activeScenario}`) })}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

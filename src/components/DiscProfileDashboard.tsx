import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
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

  const profileHighlights = (profile?.highlights ?? (t(`traitMeta.${primaryTrait}.strengths`, { returnObjects: true }) as string[])) as string[]
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

  const narrative = `${t(`traitMeta.${primaryTrait}.summary`)} ${t('dashboard.secondaryNarrative', { secondary: t(`traits.${secondaryTrait}`).toLowerCase() })}`

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-6"
      >
        <div className="rounded-[1.5rem] border border-stone-200/80 bg-[linear-gradient(135deg,_#f9f3eb,_#f1e5d8)] p-4 sm:p-5">
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
        </div>

        <div className="mt-5 h-80 w-full rounded-[1.5rem] border border-stone-200 bg-[radial-gradient(circle_at_top,_#fffaf6,_#f8efe8)] p-3" aria-label={t('dashboard.radarChartLabel')}>
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
              <span>{traitMeta[trait].label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
        className="space-y-3"
      >
        {insightSections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut', delay: 0.12 + index * 0.08 }}
            className="rounded-[1.5rem] border border-stone-200/80 bg-white/80 p-4 shadow-[0_10px_30px_-20px_rgba(84,56,45,0.35)]"
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
      </motion.div>
    </div>
  )
}

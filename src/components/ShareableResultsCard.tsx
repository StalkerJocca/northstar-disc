import { motion } from 'framer-motion'
import type { DiscScoreResponse } from '../types/disc'
import { getSignatureLeadershipStyle } from '../lib/share'
import { traitMeta } from '../lib/discProfile'

type ShareableResultsCardProps = {
  profile: DiscScoreResponse['profile'] | null
  primaryTrait: keyof typeof traitMeta
  secondaryTrait: keyof typeof traitMeta
}

const traitColors = {
  D: '#c78e69',
  I: '#d8b24a',
  S: '#688b6a',
  C: '#5d6f7d',
} as const

export default function ShareableResultsCard({ profile, primaryTrait, secondaryTrait }: ShareableResultsCardProps) {
  const signature = getSignatureLeadershipStyle(primaryTrait, secondaryTrait)
  const topTraits = (profile?.scores ?? []).slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="w-full overflow-hidden rounded-[2rem] border border-stone-200 bg-[linear-gradient(135deg,_#fffaf4,_#f5eadf)] p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)]"
    >
      <div className="rounded-[1.5rem] border border-stone-200/80 bg-white/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">Northstar DISC</p>
            <h3 className="mt-1 text-xl font-semibold text-stone-800">{signature.badge}</h3>
          </div>
          <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
            Share card
          </div>
        </div>

        <div className="mt-4 rounded-[1.25rem] border border-stone-200 bg-[linear-gradient(135deg,_#f9f3eb,_#f1e5d8)] p-4">
          <p className="text-sm font-medium text-stone-700">{signature.headline}</p>
          <p className="mt-2 text-sm leading-7 text-stone-600">{profile?.narrative ?? signature.summary}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Top traits</p>
            <div className="mt-3 space-y-2">
              {topTraits.map((item) => (
                <div key={item.trait} className="flex items-center justify-between rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: traitColors[item.trait as keyof typeof traitColors] }} />
                    <span>{traitMeta[item.trait as keyof typeof traitMeta].label}</span>
                  </span>
                  <span className="font-semibold">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Why it resonates</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-stone-700">
              {(profile?.highlights ?? []).slice(0, 3).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-stone-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

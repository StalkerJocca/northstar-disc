import { motion } from 'framer-motion'

type ResultCardProps = {
  eyebrow: string
  title: string
  body: string
  accent?: string
  children?: React.ReactNode
}

function ResultCard({ eyebrow, title, body, accent = 'from-stone-100 to-stone-50', children }: ResultCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`rounded-[2rem] border border-stone-200/80 bg-white/80 p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-6 ${accent}`}
    >
      <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-semibold text-stone-800">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-stone-600">{body}</p>
      {children}
    </motion.section>
  )
}

export default ResultCard

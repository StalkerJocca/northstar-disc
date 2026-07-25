import { motion } from 'framer-motion'

type PrivacyModalProps = {
  open: boolean
  onClose: () => void
  consent: 'undecided' | 'essential' | 'all'
  onConsentChange: (choice: 'essential' | 'all') => void
  onClearData: () => void
  onExportData: () => void
}

const tabs = [
  { id: 'privacy', label: 'Privacy' },
  { id: 'terms', label: 'Terms' },
  { id: 'method', label: 'Methodology' },
] as const

export default function PrivacyModal({ open, onClose, consent, onConsentChange, onClearData, onExportData }: PrivacyModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 px-3 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="w-full max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.45)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Privacy & data settings</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">Your data, your control</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {tabs.map((tab) => (
            <div key={tab.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">
              {tab.label}
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-5 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 text-sm leading-7 text-stone-700">
          <section>
            <h3 className="text-lg font-semibold text-stone-900">Privacy Policy</h3>
            <p className="mt-2">
              Northstar DISC stores your assessment progress and results locally in your browser to preserve continuity and allow export. We do not sell or share your personal data with third parties for advertising purposes.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-stone-900">Terms of Service</h3>
            <p className="mt-2">
              This assessment is provided for reflection, coaching, and personal development. It should not be used as the sole basis for hiring, promotion, or high-stakes decisions without additional context and professional review.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-stone-900">Assessment Methodology & Validity</h3>
            <p className="mt-2">
              The experience is designed as a lightweight behavioral reflection for self-awareness. It offers a practical, non-clinical view of preferences and can be used as a conversational starting point rather than a formal psychometric diagnosis.
            </p>
          </section>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-stone-900">Consent preferences</p>
              <p className="text-sm text-stone-600">Choose whether you allow analytics and optional preference storage.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onConsentChange('essential')} className={`rounded-full px-4 py-2 text-sm font-medium ${consent === 'essential' ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-700'}`}>
                Essential Only
              </button>
              <button type="button" onClick={() => onConsentChange('all')} className={`rounded-full px-4 py-2 text-sm font-medium ${consent === 'all' ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-700'}`}>
                Accept All
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onExportData} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
              Export Raw DISC Data (JSON)
            </button>
            <button type="button" onClick={onClearData} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100">
              Clear My Assessment Data
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

type ConsentBannerProps = {
  consent: 'undecided' | 'essential' | 'all'
  onAcceptAll: () => void
  onEssentialOnly: () => void
}

export default function ConsentBanner({ consent, onAcceptAll, onEssentialOnly }: ConsentBannerProps) {
  if (consent !== 'undecided') {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-4 shadow-[0_-12px_40px_-24px_rgba(0,0,0,0.32)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="max-w-2xl">
          <p className="font-semibold text-stone-900">We use cookies and local storage to preserve your progress and make this assessment work smoothly.</p>
          <p className="mt-1">You can choose to accept analytics and optional preference storage, or keep the experience strictly essential.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEssentialOnly} className="rounded-full border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:bg-stone-50">
            Essential Only
          </button>
          <button type="button" onClick={onAcceptAll} className="rounded-full bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700">
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}

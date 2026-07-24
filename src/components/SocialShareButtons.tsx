import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

type SocialShareButtonsProps = {
  shareText: string
  url?: string
  onShare?: (platform: 'linkedin' | 'twitter' | 'email') => void
  disabled?: boolean
}

const shareUrl = (platform: 'linkedin' | 'twitter' | 'email', text: string, url: string) => {
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(url)

  if (platform === 'email') {
    const subject = encodeURIComponent('Your Northstar DISC reflection')
    const body = encodeURIComponent(`${text}\n\n${url}`)
    return `mailto:?subject=${subject}&body=${body}`
  }

  if (platform === 'linkedin') {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  }

  return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
}

export default function SocialShareButtons({ shareText, url = 'https://disc-wellness.app', onShare, disabled }: SocialShareButtonsProps) {
  const { t } = useTranslation()
  const openShare = (platform: 'linkedin' | 'twitter' | 'email') => {
    if (disabled) {
      return
    }

    if (onShare) {
      onShare(platform)
      return
    }

    window.open(shareUrl(platform, shareText, url), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[32px] bg-stone-100/90 p-3 shadow-xl shadow-stone-900/10">
      <motion.button
        type="button"
        whileHover={{ y: -2, scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={() => openShare('linkedin')}
        disabled={disabled}
        className={`inline-flex items-center gap-2 rounded-full border border-amber-300 bg-[#fff6ea] px-5 py-3 text-sm font-semibold text-stone-900 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-amber-100'}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M6.94 8.5A1.56 1.56 0 1 0 6.94 5.38a1.56 1.56 0 0 0 0 3.12ZM5.5 9.75h2.88V18H5.5zM10.42 9.75h2.76v1.12h.04c.38-.72 1.31-1.48 2.7-1.48 2.88 0 3.41 1.9 3.41 4.37V18h-2.88v-7.3c0-1.74-.03-3.98-2.42-3.98-2.43 0-2.8 1.9-2.8 3.85V18H10.42z" />
        </svg>
        <span>{t('share.buttonLinkedIn')}</span>
      </motion.button>

      <motion.button
        type="button"
        whileHover={{ y: -2, scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={() => openShare('twitter')}
        disabled={disabled}
        className={`inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-stone-800'}`}
      >
        <span>{t('share.buttonX')}</span>
      </motion.button>

      <motion.button
        type="button"
        whileHover={{ y: -2, scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={() => openShare('email')}
        disabled={disabled}
        className={`inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-stone-50'}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M4.5 5.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Zm7.5 6.5 7.5-5.5H5.5l6.5 5.5Zm0 2.5-6.5-4.75V16.5h13v-4.75L12 14.5Z" />
        </svg>
        {t('share.buttonEmail')}
      </motion.button>
    </div>
  )
}

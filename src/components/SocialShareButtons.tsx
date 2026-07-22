import { motion } from 'framer-motion'

type SocialShareButtonsProps = {
  shareText: string
  url?: string
  onShare?: (platform: 'linkedin' | 'twitter') => void
}

const shareUrl = (platform: 'linkedin' | 'twitter', text: string, url: string) => {
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(url)

  if (platform === 'linkedin') {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  }

  return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
}

export default function SocialShareButtons({ shareText, url = 'https://disc-wellness.app', onShare }: SocialShareButtonsProps) {
  const openShare = (platform: 'linkedin' | 'twitter') => {
    if (onShare) {
      onShare(platform)
      return
    }

    window.open(shareUrl(platform, shareText, url), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-wrap gap-2">
      <motion.button
        type="button"
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => openShare('linkedin')}
        className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M6.94 8.5A1.56 1.56 0 1 0 6.94 5.38a1.56 1.56 0 0 0 0 3.12ZM5.5 9.75h2.88V18H5.5zM10.42 9.75h2.76v1.12h.04c.38-.72 1.31-1.48 2.7-1.48 2.88 0 3.41 1.9 3.41 4.37V18h-2.88v-7.3c0-1.74-.03-3.98-2.42-3.98-2.43 0-2.8 1.9-2.8 3.85V18H10.42z" />
        </svg>
        <span>Share on LinkedIn</span>
      </motion.button>
      <motion.button
        type="button"
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => openShare('twitter')}
        className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
      >
        Share on X
      </motion.button>
    </div>
  )
}

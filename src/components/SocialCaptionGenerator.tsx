import { useState } from 'react'
import { getSignatureLeadershipStyle } from '../lib/share'
import type { TraitKey } from '../types/disc'

type Props = { primaryTrait: TraitKey; secondaryTrait: TraitKey; shareUrl: string }
const hashtags = '#DISCProfile #Leadership #TeamDynamics #NorthstarDISC'

export default function SocialCaptionGenerator({ primaryTrait, secondaryTrait, shareUrl }: Props) {
  const [variant, setVariant] = useState(0); const [copied, setCopied] = useState(false)
  const signature = getSignatureLeadershipStyle(primaryTrait, secondaryTrait)
  const primary = `${primaryTrait === 'D' ? 'Drive' : primaryTrait === 'I' ? 'Influence' : primaryTrait === 'S' ? 'Steadiness' : 'Conscientiousness'} & ${secondaryTrait === 'D' ? 'Drive' : secondaryTrait === 'I' ? 'Influence' : secondaryTrait === 'S' ? 'Steadiness' : 'Conscientiousness'}`
  const captions = [
    `I just took the Northstar DISC assessment and discovered my primary profile is ${primary} — ${signature.badge}.\n\nIt gave me a clearer view of how I communicate, lead, and respond under pressure. Self-awareness is one of the most practical leadership tools we have.\n\n${shareUrl}\n\n${hashtags}`,
    `A useful reminder from my Northstar DISC results: the way I naturally work is not always the way everyone else receives information.\n\nMy ${primary} profile (${signature.badge}) gave me practical language for better collaboration and more intentional leadership.\n\nTry it here: ${shareUrl}\n\n${hashtags}`,
    `I’ve been reflecting on how I show up in teams. My Northstar DISC profile is ${primary} — ${signature.badge}.\n\nThe biggest takeaway: adapting how we communicate can make work clearer, calmer, and more effective.\n\nDiscover your profile: ${shareUrl}\n\n${hashtags}`,
  ]
  const caption = captions[variant]
  const copy = async () => { try { await navigator.clipboard.writeText(caption) } catch { const area = document.createElement('textarea'); area.value = caption; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove() }; setCopied(true); window.setTimeout(() => setCopied(false), 2600) }
  const open = (network: 'linkedin' | 'x') => { const url = network === 'linkedin' ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` : `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(shareUrl)}`; window.open(url, '_blank', 'noopener,noreferrer') }
  return <div className="rounded-[1.5rem] border border-stone-200 bg-[linear-gradient(135deg,_#fffaf5,_#f4e8dd)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[.22em] text-stone-500">Share your insight</p><span className="rounded-full bg-white px-2 py-1 text-xs text-stone-600">{variant + 1} / 3</span></div><p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">{caption}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setVariant((variant + 1) % captions.length)} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium">Try another caption</button><button type="button" onClick={() => void copy()} className="rounded-full bg-stone-900 px-3 py-2 text-sm font-medium text-white">Copy LinkedIn Post Caption</button><button type="button" onClick={() => open('linkedin')} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium">Share on LinkedIn</button><button type="button" onClick={() => open('x')} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium">Share on X</button></div>{copied ? <p className="mt-3 text-sm font-medium text-emerald-700" role="status">Caption Copied! Now attach your image on LinkedIn.</p> : null}</div>
}

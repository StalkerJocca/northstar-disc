import type { DiscProfile } from '../../types/disc'

export function downloadProfileJson(profile: DiscProfile, name = 'northstar-disc-profile') {
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    name: name.trim() || 'Northstar DISC profile',
    profile,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = `${name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'northstar-disc-profile'}.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

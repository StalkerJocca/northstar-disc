import type { DiscProfile } from '../types/disc'

export type TeamWorkspace = { id: string; name: string; createdAt: string; invites: number }
export type InvitedMember = { name: string; profile: Pick<DiscProfile, 'primaryTrait' | 'secondaryTrait' | 'scores'> }

const encode = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
const decode = <T,>(value: string | null): T | null => { try { if (!value) return null; const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4); return JSON.parse(decodeURIComponent(escape(atob(padded)))) as T } catch { return null } }
export const createWorkspace = (name: string): TeamWorkspace => ({ id: crypto.randomUUID(), name: name.trim() || 'Northstar Team', createdAt: new Date().toISOString(), invites: 0 })
export const inviteUrl = (workspace: TeamWorkspace) => { const url = new URL(window.location.href); url.searchParams.set('invite', encode({ id: workspace.id, name: workspace.name })); url.searchParams.delete('teamMember'); return url.toString() }
export const readInvite = () => decode<{ id: string; name: string }>(new URLSearchParams(window.location.search).get('invite'))
export const memberReturnUrl = (invite: { id: string; name: string }, profile: DiscProfile, name = 'Team member') => { const url = new URL(window.location.href); url.searchParams.set('invite', encode(invite)); url.searchParams.set('teamMember', encode({ name, profile })); return url.toString() }
export const readInvitedMember = () => decode<InvitedMember>(new URLSearchParams(window.location.search).get('teamMember'))

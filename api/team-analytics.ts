import { getAuthenticatedUser, getSupabaseAdmin } from '../server/supabase.js'
import { createNodeHandler } from '../server/vercel.js'

const traits = ['D', 'I', 'S', 'C'] as const
type Trait = typeof traits[number]
type Profile = { primaryTrait: Trait; secondaryTrait: Trait; scores: Array<{ trait: Trait; percentage: number }> }

function isProfile(value: unknown): value is Profile {
  const profile = value as Partial<Profile>
  return Boolean(profile && traits.includes(profile.primaryTrait as Trait) && traits.includes(profile.secondaryTrait as Trait) && Array.isArray(profile.scores) && profile.scores.length === 4)
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const user = await getAuthenticatedUser(request)
  const teamId = new URL(request.url).searchParams.get('team_id')
  if (!user) return Response.json({ error: 'Authentication is required.' }, { status: 401 })
  if (!teamId) return Response.json({ error: 'team_id is required.' }, { status: 400 })
  try {
    const admin = getSupabaseAdmin()
    const { data: team, error: teamError } = await admin.from('teams').select('id, name, owner_id').eq('id', teamId).maybeSingle()
    if (teamError) throw teamError
    if (!team) return Response.json({ error: 'Team not found.' }, { status: 404 })
    const { data: invitation, error: invitationError } = await admin.from('team_invitations').select('id').eq('team_id', teamId).eq('accepted_by', user.id).not('accepted_at', 'is', null).maybeSingle()
    if (invitationError) throw invitationError
    if (team.owner_id !== user.id && !invitation) return Response.json({ error: 'You do not have access to this team.' }, { status: 403 })
    const { data: rows, error } = await admin.from('team_members').select('id, display_name, assessment_id, reports!inner(disc_scores)').eq('team_id', teamId).order('created_at')
    if (error) throw error
    const members = (rows ?? []).flatMap((row) => {
      const report = Array.isArray(row.reports) ? row.reports[0] : row.reports
      return isProfile(report?.disc_scores) ? [{ id: row.id, name: row.display_name, assessmentId: row.assessment_id, profile: report.disc_scores }] : []
    })
    const distribution = Object.fromEntries(traits.map((trait) => [trait, members.filter((member) => member.profile.primaryTrait === trait).length])) as Record<Trait, number>
    const averages = Object.fromEntries(traits.map((trait) => [trait, members.length ? Math.round(members.reduce((sum, member) => sum + (member.profile.scores.find((score) => score.trait === trait)?.percentage ?? 0), 0) / members.length) : 0])) as Record<Trait, number>
    const strongest = [...traits].sort((a, b) => averages[b] - averages[a]); const lowest = strongest[strongest.length - 1]
    const synergy = strongest.slice(0, 2).map((trait) => `${trait}-led collaboration is a team strength.`)
    const conflict = members.length > 1 && averages[lowest] < 20 ? [`Low ${lowest} representation may leave this team without that perspective.`] : []
    return Response.json({ team: { id: team.id, name: team.name }, members, summary: { count: members.length, quadrantDistribution: distribution, naturalBlendMap: averages, adaptedBlendMap: null, synergyPoints: synergy, conflictPoints: conflict } })
  } catch (error) {
    console.error('Team analytics failed.', error)
    return Response.json({ error: 'Unable to load team analytics.' }, { status: 500 })
  }
}

export default createNodeHandler(handleRequest)

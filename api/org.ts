import { getAuthenticatedUser, getSupabaseAdmin } from "../server/supabase.js";
import { createNodeHandler } from "../server/vercel.js";

type Action =
  | "create"
  | "details"
  | "invite"
  | "role"
  | "revoke"
  | "reassign-client"
  | "branding";
const roles = ["admin", "coach", "member"] as const;
const emailPattern = /^\S+@\S+\.\S+$/;

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "POST")
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  const user = await getAuthenticatedUser(request);
  if (!user)
    return Response.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const action = new URL(request.url).searchParams.get(
    "action",
  ) as Action | null;
  const admin = getSupabaseAdmin();
  try {
    if (action === "create")
      return await createOrganization(admin, user.id, body);
    const organizationId = string(body.organizationId);
    if (!organizationId)
      return Response.json(
        { error: "organizationId is required." },
        { status: 400 },
      );
    const { data: membership } = await admin
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership)
      return Response.json(
        { error: "Organization membership is required." },
        { status: 403 },
      );
    if (action === "details")
      return await details(admin, organizationId, membership.role);
    if (!["owner", "admin"].includes(membership.role))
      return Response.json(
        { error: "Administrator access is required." },
        { status: 403 },
      );
    if (action === "invite")
      return await invite(admin, organizationId, user.id, body);
    if (action === "role")
      return await changeRole(admin, organizationId, user.id, body);
    if (action === "revoke")
      return await revoke(admin, organizationId, user.id, body);
    if (action === "reassign-client")
      return await reassignClient(admin, organizationId, user.id, body);
    if (action === "branding")
      return await updateBranding(
        admin,
        organizationId,
        user.id,
        membership.role,
        body,
      );
    return Response.json(
      { error: "Unknown organization action." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Organization API error", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Organization operation failed.",
      },
      { status: 500 },
    );
  }
}
async function createOrganization(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  body: Record<string, unknown>,
) {
  const name = string(body.name).trim().slice(0, 120);
  if (!name)
    return Response.json(
      { error: "Organization name is required." },
      { status: 400 },
    );
  const { data, error } = await admin
    .from("organizations")
    .insert({ name, created_by: userId })
    .select("id")
    .single();
  if (error || !data)
    throw error ?? new Error("Unable to create organization.");
  const { error: membershipError } = await admin
    .from("organization_memberships")
    .insert({ organization_id: data.id, user_id: userId, role: "owner" });
  if (membershipError) throw membershipError;
  await audit(
    admin,
    data.id,
    userId,
    "organization.created",
    "organization",
    data.id,
  );
  return Response.json({ organizationId: data.id });
}
async function details(
  admin: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  role: string,
) {
  const [
    { data: organization, error },
    { data: memberships },
    { data: invitations },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select(
        "id,name,seat_limit,subscription_plan,logo_url,primary_color,footer_text,branding_locked",
      )
      .eq("id", organizationId)
      .single(),
    admin
      .from("organization_memberships")
      .select("user_id,role,created_at,users(email)")
      .eq("organization_id", organizationId)
      .order("created_at"),
    admin
      .from("organization_invitations")
      .select("id,email,role,expires_at,created_at")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .order("created_at"),
  ]);
  if (error || !organization)
    throw error ?? new Error("Organization not found.");
  const pending = (invitations ?? []).filter(
    (item) => new Date(item.expires_at).getTime() > Date.now(),
  );
  return Response.json({
    organization,
    currentRole: role,
    memberships: memberships ?? [],
    invitations: pending,
    remainingSeats: Math.max(
      0,
      organization.seat_limit - (memberships?.length ?? 0) - pending.length,
    ),
  });
}
async function invite(
  admin: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  actorId: string,
  body: Record<string, unknown>,
) {
  const email = string(body.email).trim().toLowerCase();
  const role = roles.includes(body.role as (typeof roles)[number])
    ? (body.role as (typeof roles)[number])
    : "member";
  if (!emailPattern.test(email))
    return Response.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  const { data, error } = await admin
    .from("organization_invitations")
    .upsert(
      {
        organization_id: organizationId,
        email,
        role,
        invited_by: actorId,
        expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      },
      { onConflict: "organization_id,email" },
    )
    .select("token")
    .single();
  if (error || !data) throw error ?? new Error("Unable to create invitation.");
  await audit(
    admin,
    organizationId,
    actorId,
    "member.invited",
    "invitation",
    data.token,
    { email, role },
  );
  return Response.json({ token: data.token });
}
async function changeRole(
  admin: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  actorId: string,
  body: Record<string, unknown>,
) {
  const userId = string(body.userId);
  const role = body.role;
  if (!userId || !roles.includes(role as (typeof roles)[number]))
    return Response.json({ error: "Invalid role update." }, { status: 400 });
  const { data: target } = await admin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target || target.role === "owner")
    return Response.json(
      { error: "Owners cannot be changed." },
      { status: 409 },
    );
  const { error } = await admin
    .from("organization_memberships")
    .update({ role })
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  if (error) throw error;
  await audit(
    admin,
    organizationId,
    actorId,
    "member.role_changed",
    "user",
    userId,
    { role },
  );
  return Response.json({ ok: true });
}
async function revoke(
  admin: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  actorId: string,
  body: Record<string, unknown>,
) {
  const userId = string(body.userId);
  if (!userId)
    return Response.json({ error: "userId is required." }, { status: 400 });
  const { data: target } = await admin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target || target.role === "owner")
    return Response.json(
      { error: "Owners cannot be revoked." },
      { status: 409 },
    );
  const { error } = await admin
    .from("organization_memberships")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  if (error) throw error;
  await audit(admin, organizationId, actorId, "member.revoked", "user", userId);
  return Response.json({ ok: true });
}
async function reassignClient(
  admin: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  actorId: string,
  body: Record<string, unknown>,
) {
  const clientId = string(body.clientId);
  const coachId = string(body.coachId);
  if (!clientId || !coachId)
    return Response.json(
      { error: "clientId and coachId are required." },
      { status: 400 },
    );
  const { data: coach } = await admin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", coachId)
    .maybeSingle();
  if (!coach || !["owner", "admin", "coach"].includes(coach.role))
    return Response.json(
      { error: "The selected user is not an internal coach." },
      { status: 400 },
    );
  const { data: client } = await admin
    .from("coach_clients")
    .select("user_id,organization_id")
    .eq("id", clientId)
    .maybeSingle();
  if (
    !client ||
    (client.organization_id !== organizationId && client.user_id !== actorId)
  )
    return Response.json(
      { error: "Client profile is outside this organization." },
      { status: 403 },
    );
  const { error } = await admin
    .from("coach_clients")
    .update({ user_id: coachId, organization_id: organizationId })
    .eq("id", clientId);
  if (error) throw error;
  await audit(
    admin,
    organizationId,
    actorId,
    "client.reassigned",
    "coach_client",
    clientId,
    { coachId },
  );
  return Response.json({ ok: true });
}
async function updateBranding(
  admin: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  actorId: string,
  role: string,
  body: Record<string, unknown>,
) {
  if (role !== "owner")
    return Response.json(
      { error: "Only organization owners can change global branding." },
      { status: 403 },
    );
  const logoUrl = nullableString(body.logoUrl, 2048);
  const primaryColor = nullableString(body.primaryColor, 7);
  const footerText = nullableString(body.footerText, 500);
  if (primaryColor && !/^#[0-9a-fA-F]{6}$/.test(primaryColor))
    return Response.json(
      { error: "Primary color must be a hex color." },
      { status: 400 },
    );
  const { error } = await admin
    .from("organizations")
    .update({
      logo_url: logoUrl,
      primary_color: primaryColor,
      footer_text: footerText,
      branding_locked: body.brandingLocked === true,
    })
    .eq("id", organizationId);
  if (error) throw error;
  await audit(
    admin,
    organizationId,
    actorId,
    "branding.updated",
    "organization",
    organizationId,
  );
  return Response.json({ ok: true });
}
async function audit(
  admin: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  await admin
    .from("audit_logs")
    .insert({
      organization_id: organizationId,
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    });
}
function string(value: unknown) {
  return typeof value === "string" ? value : "";
}
function nullableString(value: unknown, limit: number) {
  const text = string(value).trim().slice(0, limit);
  return text || null;
}
export default createNodeHandler(handleRequest);

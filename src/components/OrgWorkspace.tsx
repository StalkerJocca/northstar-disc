import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Role = "owner" | "admin" | "coach" | "member";
type Organization = {
  id: string;
  name: string;
  seat_limit: number;
  logo_url: string | null;
  primary_color: string | null;
  footer_text: string | null;
  branding_locked: boolean;
};
type Membership = {
  user_id: string;
  role: Role;
  users: { email: string } | null;
};
type Invitation = {
  id: string;
  email: string;
  role: Exclude<Role, "owner">;
  expires_at: string;
};
type Client = {
  id: string;
  client_name: string;
  client_email: string;
  user_id: string;
};
type Details = {
  organization: Organization;
  currentRole: Role;
  memberships: Membership[];
  invitations: Invitation[];
  remainingSeats: number;
};

export default function OrgWorkspace({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [details, setDetails] = useState<Details | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<Role, "owner">>("coach");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [branding, setBranding] = useState({
    logoUrl: "",
    primaryColor: "#8b5e3c",
    footerText: "",
    brandingLocked: false,
  });
  const call = async (action: string, body: Record<string, unknown>) => {
    if (!supabase) throw new Error("Authentication is not configured.");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`/api/org?action=${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok)
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Organization operation failed.",
      );
    return result;
  };
  const loadOrganizations = async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase
      .from("organization_memberships")
      .select(
        "organizations!inner(id,name,seat_limit,logo_url,primary_color,footer_text,branding_locked)",
      )
      .eq("user_id", user.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    const orgs = (data ?? []).map(
      (item) => item.organizations as unknown as Organization,
    );
    setOrganizations(orgs);
    setOrganizationId((current) =>
      current && orgs.some((org) => org.id === current)
        ? current
        : (orgs[0]?.id ?? ""),
    );
  };
  const loadDetails = async () => {
    if (!organizationId) {
      setDetails(null);
      return;
    }
    try {
      const result = (await call("details", {
        organizationId,
      })) as unknown as Details;
      setDetails(result);
      setBranding({
        logoUrl: result.organization.logo_url ?? "",
        primaryColor: result.organization.primary_color ?? "#8b5e3c",
        footerText: result.organization.footer_text ?? "",
        brandingLocked: result.organization.branding_locked,
      });
      if (supabase) {
        const clientFilter = user?.id
          ? `organization_id.eq.${organizationId},user_id.eq.${user.id}`
          : `organization_id.eq.${organizationId}`;
        const { data } = await supabase
          .from("coach_clients")
          .select("id,client_name,client_email,user_id")
          .or(clientFilter)
          .order("created_at", { ascending: false });
        setClients((data ?? []) as Client[]);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load organization.",
      );
    }
  };
  useEffect(() => {
    void loadOrganizations();
  }, [user]);
  useEffect(() => {
    void loadDetails();
  }, [organizationId]);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("org_invite");
    if (!supabase || !user || !token) return;
    void supabase
      .rpc("accept_organization_invitation", { p_token: token })
      .then(({ error }) => {
        if (error) setMessage(error.message);
        else {
          window.history.replaceState({}, "", "/workspace");
          setMessage("Organization invitation accepted.");
          void loadOrganizations();
        }
      });
  }, [user]);
  const create = async () => {
    try {
      setBusy(true);
      const result = await call("create", { name });
      setName("");
      await loadOrganizations();
      setOrganizationId(String(result.organizationId));
      setMessage("Organization created.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create organization.",
      );
    } finally {
      setBusy(false);
    }
  };
  const invite = async () => {
    try {
      setBusy(true);
      const result = await call("invite", {
        organizationId,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail("");
      const token = typeof result.token === "string" ? result.token : "";
      if (token)
        await navigator.clipboard.writeText(
          `${window.location.origin}/workspace?org_invite=${token}`,
        );
      setMessage(
        token ? "Invitation link copied to your clipboard." : "Invitation created.",
      );
      await loadDetails();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to invite member.",
      );
    } finally {
      setBusy(false);
    }
  };
  const mutate = async (
    action: string,
    body: Record<string, unknown>,
    success: string,
  ) => {
    try {
      setBusy(true);
      await call(action, { organizationId, ...body });
      setMessage(success);
      await loadDetails();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update organization.",
      );
    } finally {
      setBusy(false);
    }
  };
  const isManager =
    details?.currentRole === "owner" || details?.currentRole === "admin";
  const isOwner = details?.currentRole === "owner";
  return (
    <section className="mt-5 space-y-5">
      <div className="rounded-[2rem] border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-sm underline"
            >
              Back to roster
            </button>
            <h2 className="mt-2 text-xl font-semibold">
              Team &amp; Seat Management
            </h2>
          </div>
          {organizations.length ? (
            <label className="text-sm">
              Organization{" "}
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                className="ml-2 rounded-xl border p-2"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New organization name"
            className="rounded-xl border p-2"
          />
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => void create()}
            className="rounded-full bg-stone-900 px-4 text-sm text-white disabled:opacity-50"
          >
            Create organization
          </button>
        </div>
        {message ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}
      </div>
      {details ? (
        <>
          <section className="rounded-[2rem] border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">
                  {details.organization.name}
                </h3>
                <p className="text-sm text-stone-600">
                  Your role: {details.currentRole}
                </p>
              </div>
              <p className="rounded-full bg-stone-100 px-3 py-2 text-sm">
                <strong>{details.remainingSeats}</strong> of{" "}
                {details.organization.seat_limit} seats remaining
              </p>
            </div>
            {isManager ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  type="email"
                  placeholder="colleague@company.com"
                  className="rounded-xl border p-2"
                />
                <select
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as Exclude<Role, "owner">)
                  }
                  className="rounded-xl border p-2"
                >
                  <option value="admin">Admin</option>
                  <option value="coach">Coach</option>
                  <option value="member">Member</option>
                </select>
                <button
                  type="button"
                  disabled={busy || details.remainingSeats < 1}
                  onClick={() => void invite()}
                  className="rounded-full bg-stone-900 px-4 text-sm text-white disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            ) : null}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-stone-500">
                    <th className="p-2">Member</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Seat</th>
                  </tr>
                </thead>
                <tbody>
                  {details.memberships.map((member) => (
                    <tr key={member.user_id} className="border-b">
                      <td className="p-2">
                        {member.users?.email ?? member.user_id}
                      </td>
                      <td className="p-2">
                        {isManager && member.role !== "owner" ? (
                          <select
                            value={member.role}
                            disabled={busy}
                            onChange={(event) =>
                              void mutate(
                                "role",
                                {
                                  userId: member.user_id,
                                  role: event.target.value,
                                },
                                "Role updated.",
                              )
                            }
                            className="rounded border p-1"
                          >
                            <option value="admin">Admin</option>
                            <option value="coach">Coach</option>
                            <option value="member">Member</option>
                          </select>
                        ) : (
                          member.role
                        )}
                      </td>
                      <td className="p-2">
                        {isManager && member.role !== "owner" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                "revoke",
                                { userId: member.user_id },
                                "Seat revoked.",
                              )
                            }
                            className="text-red-700 underline"
                          >
                            Revoke
                          </button>
                        ) : (
                          "Assigned"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {details.invitations.length ? (
              <div className="mt-5">
                <h4 className="font-medium">Pending invitations</h4>
                {details.invitations.map((invitation) => (
                  <p
                    key={invitation.id}
                    className="mt-2 rounded-xl bg-stone-50 p-3 text-sm"
                  >
                    {invitation.email} · {invitation.role} · expires{" "}
                    {new Date(invitation.expires_at).toLocaleDateString()}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
          {isManager ? (
            <section className="rounded-[2rem] border bg-white p-5">
              <h3 className="text-lg font-semibold">
                Client profile reassignment
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                Move a client profile to an internal coach.
              </p>
              <div className="mt-4 space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 p-3 text-sm"
                  >
                    <span>
                      {client.client_name} · {client.client_email}
                    </span>
                    <select
                      value={client.user_id}
                      disabled={busy}
                      onChange={(event) =>
                        void mutate(
                          "reassign-client",
                          { clientId: client.id, coachId: event.target.value },
                          "Client reassigned.",
                        )
                      }
                      className="rounded border p-1"
                    >
                      {details.memberships
                        .filter((member) =>
                          ["owner", "admin", "coach"].includes(member.role),
                        )
                        .map((coach) => (
                          <option key={coach.user_id} value={coach.user_id}>
                            {coach.users?.email ?? coach.user_id}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
                {!clients.length ? (
                  <p className="text-sm text-stone-600">
                    No organization client profiles yet.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
          {isOwner ? (
            <section className="rounded-[2rem] border bg-white p-5">
              <h3 className="text-lg font-semibold">Global report branding</h3>
              <p className="mt-1 text-sm text-stone-600">
                These settings are enforced for reports generated by coaches in
                this organization.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={branding.logoUrl}
                  onChange={(event) =>
                    setBranding({ ...branding, logoUrl: event.target.value })
                  }
                  placeholder="Logo URL"
                  className="rounded-xl border p-2"
                />
                <input
                  value={branding.primaryColor}
                  onChange={(event) =>
                    setBranding({
                      ...branding,
                      primaryColor: event.target.value,
                    })
                  }
                  placeholder="#8b5e3c"
                  className="rounded-xl border p-2"
                />
                <input
                  value={branding.footerText}
                  onChange={(event) =>
                    setBranding({ ...branding, footerText: event.target.value })
                  }
                  placeholder="Footer text"
                  className="rounded-xl border p-2 sm:col-span-2"
                />
              </div>
              <label className="mt-3 block text-sm">
                <input
                  checked={branding.brandingLocked}
                  onChange={(event) =>
                    setBranding({
                      ...branding,
                      brandingLocked: event.target.checked,
                    })
                  }
                  type="checkbox"
                  className="mr-2"
                />
                Enforce organization branding
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void mutate("branding", branding, "Global branding saved.")
                }
                className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Save global branding
              </button>
            </section>
          ) : null}
        </>
      ) : (
        <p className="rounded-[2rem] border bg-white p-5 text-sm text-stone-600">
          Create or join an organization to manage enterprise collaboration.
        </p>
      )}
    </section>
  );
}

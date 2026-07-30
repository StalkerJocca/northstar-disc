-- Phase 23: enterprise organizations, roles, seats and shared branding.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  seat_limit integer not null default 5 check (seat_limit > 0),
  subscription_plan text not null default 'enterprise' check (subscription_plan in ('enterprise')),
  logo_url text,
  primary_color text check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  footer_text text,
  branding_locked boolean not null default false,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'coach', 'member')),
  created_at timestamptz not null default now(), primary key (organization_id, user_id)
);
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'coach', 'member')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.users(id),
  accepted_by uuid references public.users(id), accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days', created_at timestamptz not null default now(),
  unique (organization_id, email)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null, action text not null, target_type text not null,
  target_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

alter table public.coach_clients add column organization_id uuid references public.organizations(id) on delete set null;
alter table public.teams add column organization_id uuid references public.organizations(id) on delete set null;
create index organization_memberships_user_idx on public.organization_memberships(user_id);
create index organization_invitations_org_idx on public.organization_invitations(organization_id) where accepted_at is null;
create index audit_logs_org_idx on public.audit_logs(organization_id, created_at desc);
create index coach_clients_organization_idx on public.coach_clients(organization_id, created_at desc);
create index teams_organization_idx on public.teams(organization_id, created_at desc);
create trigger organizations_set_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();

create function public.organization_role(p_org uuid) returns text language sql stable security definer set search_path=public as $$
  select role from public.organization_memberships where organization_id = p_org and user_id = auth.uid()
$$;
create function public.can_manage_organization(p_org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.organization_role(p_org) in ('owner', 'admin'), false)
$$;
create function public.can_manage_organization_work(p_org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.organization_role(p_org) in ('owner', 'admin', 'coach'), false)
$$;

-- Count pending invitations as reserved seats.  This is enforced in the database,
-- so concurrent API requests cannot oversubscribe an organization.
create function public.assert_organization_seat() returns trigger language plpgsql security definer set search_path=public as $$
declare used_seats integer; allowed_seats integer; target_org uuid;
begin
  target_org := new.organization_id;
  select seat_limit into allowed_seats from public.organizations where id = target_org for update;
  select (select count(*) from public.organization_memberships where organization_id = target_org)
       + (select count(*) from public.organization_invitations where organization_id = target_org and accepted_at is null and expires_at > now()) into used_seats;
  if tg_table_name = 'organization_invitations' then used_seats := used_seats - 1; end if;
  if used_seats >= allowed_seats then raise exception 'Organization seat limit has been reached'; end if;
  return new;
end; $$;
create trigger organization_memberships_seat_limit before insert on public.organization_memberships for each row execute procedure public.assert_organization_seat();
create trigger organization_invitations_seat_limit before insert or update of accepted_at, expires_at on public.organization_invitations for each row when (new.accepted_at is null and new.expires_at > now()) execute procedure public.assert_organization_seat();

create function public.accept_organization_invitation(p_token uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare invitation public.organization_invitations;
begin
  select * into invitation from public.organization_invitations where token = p_token for update;
  if invitation.id is null or invitation.expires_at <= now() then raise exception 'Invitation is invalid or expired'; end if;
  if lower(invitation.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'Invitation email does not match the signed-in account'; end if;
  if invitation.accepted_by is not null and invitation.accepted_by <> auth.uid() then raise exception 'Invitation has already been accepted'; end if;
  perform 1 from public.organizations where id = invitation.organization_id for update;
  update public.organization_invitations set accepted_by = auth.uid(), accepted_at = now() where id = invitation.id;
  insert into public.organization_memberships (organization_id, user_id, role) values (invitation.organization_id, auth.uid(), invitation.role)
    on conflict (organization_id, user_id) do update set role = excluded.role;
  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id) values (invitation.organization_id, auth.uid(), 'member.joined', 'user', auth.uid()::text);
  return invitation.organization_id;
end; $$;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.audit_logs enable row level security;
create policy "members read organizations" on public.organizations for select using (public.organization_role(id) is not null);
create policy "members read memberships" on public.organization_memberships for select using (public.organization_role(organization_id) is not null);
create policy "admins manage memberships" on public.organization_memberships for all using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));
create policy "members read invitations" on public.organization_invitations for select using (public.organization_role(organization_id) is not null);
create policy "admins manage invitations" on public.organization_invitations for all using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));
create policy "admins read audits" on public.audit_logs for select using (public.organization_role(organization_id) in ('owner', 'admin'));

drop policy "coaches manage their own clients" on public.coach_clients;
create policy "coaches manage personal or organization clients" on public.coach_clients for all using (
  user_id = auth.uid() or (organization_id is not null and public.can_manage_organization_work(organization_id))
) with check (user_id = auth.uid() or (organization_id is not null and public.can_manage_organization_work(organization_id)));
drop policy "team owners and co-managers read teams" on public.teams;
create policy "team owners and organization members read teams" on public.teams for select using (
  public.can_access_team(id) or (organization_id is not null and public.organization_role(organization_id) is not null)
);
create policy "organization coaches manage teams" on public.teams for all using (
  organization_id is not null and public.can_manage_organization_work(organization_id)
) with check (organization_id is not null and public.can_manage_organization_work(organization_id));

revoke all on function public.organization_role(uuid) from public; grant execute on function public.organization_role(uuid) to authenticated;
revoke all on function public.can_manage_organization(uuid) from public; grant execute on function public.can_manage_organization(uuid) to authenticated;
revoke all on function public.can_manage_organization_work(uuid) from public; grant execute on function public.can_manage_organization_work(uuid) to authenticated;
revoke all on function public.accept_organization_invitation(uuid) from public; grant execute on function public.accept_organization_invitation(uuid) to authenticated;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  assessment_id uuid not null references public.reports(id) on delete restrict,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (team_id, assessment_id)
);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete cascade,
  invited_email text not null,
  role text not null default 'co_manager' check (role = 'co_manager'),
  token uuid not null unique default gen_random_uuid(),
  accepted_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  unique (team_id, invited_email)
);

create index team_members_team_id_idx on public.team_members(team_id);
create index team_invitations_team_id_idx on public.team_invitations(team_id);
create index team_invitations_token_idx on public.team_invitations(token);
create trigger teams_set_updated_at before update on public.teams for each row execute procedure public.set_updated_at();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;

create function public.can_access_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams where id = p_team_id and owner_id = auth.uid())
      or exists (select 1 from public.team_invitations where team_id = p_team_id and accepted_by = auth.uid() and accepted_at is not null);
$$;

create function public.accept_team_invitation(p_token uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare invitation public.team_invitations;
begin
  select * into invitation from public.team_invitations where token = p_token for update;
  if invitation.id is null or invitation.expires_at < now() then raise exception 'Invitation is invalid or expired'; end if;
  if lower(invitation.invited_email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'Invitation email does not match the signed-in account'; end if;
  if invitation.accepted_by is not null and invitation.accepted_by <> auth.uid() then raise exception 'Invitation has already been accepted'; end if;
  update public.team_invitations set accepted_by = auth.uid(), accepted_at = coalesce(accepted_at, now()) where id = invitation.id;
  return invitation.team_id;
end; $$;

create policy "team owners and co-managers read teams" on public.teams for select using (public.can_access_team(id));
create policy "owners create teams" on public.teams for insert with check (owner_id = auth.uid());
create policy "owners and co-managers update teams" on public.teams for update using (public.can_access_team(id)) with check (public.can_access_team(id));
create policy "owners delete teams" on public.teams for delete using (owner_id = auth.uid());

create policy "team owners and co-managers read members" on public.team_members for select using (public.can_access_team(team_id));
create policy "team owners and co-managers add readable assessments" on public.team_members for insert with check (
  public.can_access_team(team_id)
  and exists (select 1 from public.reports where reports.id = assessment_id)
);
create policy "team owners and co-managers update members" on public.team_members for update using (public.can_access_team(team_id)) with check (
  public.can_access_team(team_id)
  and exists (select 1 from public.reports where reports.id = assessment_id)
);
create policy "team owners and co-managers delete members" on public.team_members for delete using (public.can_access_team(team_id));
create policy "team owners and co-managers manage invitations" on public.team_invitations for all using (public.can_access_team(team_id)) with check (public.can_access_team(team_id));

revoke all on function public.can_access_team(uuid) from public;
grant execute on function public.can_access_team(uuid) to authenticated;
revoke all on function public.accept_team_invitation(uuid) from public;
grant execute on function public.accept_team_invitation(uuid) to authenticated;

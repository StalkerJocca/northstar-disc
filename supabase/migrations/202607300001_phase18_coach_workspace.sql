create table public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_email text not null,
  client_name text not null,
  status text not null default 'invited' check (status in ('invited', 'completed', 'revoked')),
  invite_token uuid not null unique default gen_random_uuid(),
  assessment_id uuid references public.reports(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, client_email)
);

create index coach_clients_user_id_idx on public.coach_clients (user_id, created_at desc);
create index coach_clients_invite_token_idx on public.coach_clients (invite_token);

alter table public.coach_clients enable row level security;
create policy "coaches manage their own clients" on public.coach_clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "coaches read completed client reports" on public.reports for select using (
  exists (
    select 1 from public.coach_clients
    where coach_clients.assessment_id = reports.id
      and coach_clients.user_id = auth.uid()
      and coach_clients.status = 'completed'
  )
);

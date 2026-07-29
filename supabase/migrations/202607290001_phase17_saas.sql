create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  entitlement_plan text not null default 'free' check (entitlement_plan in ('free', 'executive', 'team', 'enterprise')),
  entitlement_status text not null default 'inactive'
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text, stripe_subscription_id text unique, stripe_checkout_session_id text unique,
  plan_type text not null check (plan_type in ('executive', 'team', 'enterprise')), status text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  disc_scores jsonb not null, profile_type text not null default 'individual', created_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  name text not null, created_at timestamptz not null default now()
);
create table public.branding (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.users(id) on delete cascade,
  logo_url text, brand_color text, company_name text, footer_note text, updated_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.users (id, email) values (new.id, coalesce(new.email, '')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.users enable row level security; alter table public.subscriptions enable row level security; alter table public.reports enable row level security; alter table public.workspaces enable row level security; alter table public.branding enable row level security;
create policy "users read self" on public.users for select using (auth.uid() = id);
create policy "subscriptions read self" on public.subscriptions for select using (auth.uid() = user_id);
create policy "reports manage self" on public.reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workspaces manage self" on public.workspaces for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "branding manage self" on public.branding for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index reports_user_id_created_at_idx on public.reports (user_id, created_at desc);
create index workspaces_user_id_idx on public.workspaces (user_id);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at();
create trigger branding_set_updated_at before update on public.branding for each row execute procedure public.set_updated_at();

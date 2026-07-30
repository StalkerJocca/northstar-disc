alter table public.users add column coach_invite_credits integer not null default 3 check (coach_invite_credits >= 0);

create table public.coach_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  credits integer not null check (credits > 0),
  created_at timestamptz not null default now()
);
alter table public.coach_credit_purchases enable row level security;
create policy "coaches read own credit purchases" on public.coach_credit_purchases for select using (auth.uid() = user_id);

-- Called only by the server service-role client. The row lock makes credit
-- consumption safe when a coach opens multiple invite windows concurrently.
create function public.consume_coach_invite_credit(p_user_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare balance integer;
begin
  select coach_invite_credits into balance from public.users where id = p_user_id for update;
  if balance is null or balance < 1 then return false; end if;
  update public.users set coach_invite_credits = coach_invite_credits - 1 where id = p_user_id;
  return true;
end; $$;

revoke all on function public.consume_coach_invite_credit(uuid) from public;

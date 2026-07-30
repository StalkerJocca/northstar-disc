create table public.stripe_processed_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  claimed_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

alter table public.stripe_processed_events enable row level security;

create function public.claim_stripe_webhook_event(p_event_id text, p_event_type text) returns boolean
language plpgsql security definer set search_path = public as $$
declare updated_count integer;
begin
  insert into public.stripe_processed_events (event_id, event_type)
  values (p_event_id, p_event_type)
  on conflict (event_id) do nothing;
  if found then return true; end if;

  update public.stripe_processed_events
  set status = 'processing', attempts = attempts + 1, claimed_at = now(), last_error = null
  where event_id = p_event_id
    and (status = 'failed' or (status = 'processing' and claimed_at < now() - interval '5 minutes'));
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end; $$;

create function public.complete_stripe_webhook_event(p_event_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.stripe_processed_events set status = 'completed', processed_at = now(), last_error = null where event_id = p_event_id;
end; $$;

create function public.fail_stripe_webhook_event(p_event_id text, p_error text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.stripe_processed_events set status = 'failed', last_error = left(p_error, 1000) where event_id = p_event_id;
end; $$;

revoke all on table public.stripe_processed_events from anon, authenticated;
revoke all on function public.claim_stripe_webhook_event(text, text) from public;
revoke all on function public.complete_stripe_webhook_event(text) from public;
revoke all on function public.fail_stripe_webhook_event(text, text) from public;

-- Insert the purchase record and grant credits in one transaction. This makes a
-- Stripe retry safe even when a prior delivery failed after beginning work.
create function public.apply_coach_credit_purchase(p_user_id uuid, p_session_id text, p_credits integer) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.coach_credit_purchases (user_id, stripe_checkout_session_id, credits)
  values (p_user_id, p_session_id, p_credits)
  on conflict (stripe_checkout_session_id) do nothing;
  if not found then return false; end if;

  update public.users
  set coach_invite_credits = coach_invite_credits + p_credits
  where id = p_user_id;
  if not found then raise exception 'Coach account % does not exist', p_user_id; end if;
  return true;
end; $$;

revoke all on function public.apply_coach_credit_purchase(uuid, text, integer) from public;

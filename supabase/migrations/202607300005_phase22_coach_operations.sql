alter table public.coach_clients
  add column expires_at timestamptz not null default now() + interval '14 days',
  add column invite_sent_at timestamptz,
  add column invite_send_count integer not null default 0 check (invite_send_count >= 0),
  add column revoked_at timestamptz,
  add column credit_refunded_at timestamptz,
  add column archived_at timestamptz,
  add column private_notes text not null default '',
  add column tags text[] not null default '{}';

alter table public.coach_clients drop constraint coach_clients_status_check;
alter table public.coach_clients add constraint coach_clients_status_check check (status in ('invited', 'completed', 'revoked', 'expired'));
create index coach_clients_expiry_idx on public.coach_clients(user_id, expires_at) where status = 'invited';
create index coach_clients_tags_idx on public.coach_clients using gin(tags);

create function public.revoke_coach_invite(p_user_id uuid, p_client_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare client public.coach_clients;
begin
  select * into client from public.coach_clients where id = p_client_id and user_id = p_user_id for update;
  if client.id is null or client.status <> 'invited' then return false; end if;
  update public.coach_clients set status = 'revoked', revoked_at = now(), credit_refunded_at = now() where id = client.id;
  update public.users set coach_invite_credits = coach_invite_credits + 1 where id = p_user_id;
  return true;
end; $$;
revoke all on function public.revoke_coach_invite(uuid, uuid) from public;

create function public.expire_coach_invites(p_user_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.coach_clients set status = 'expired'
  where user_id = p_user_id and status = 'invited' and expires_at <= now();
$$;
revoke all on function public.expire_coach_invites(uuid) from public;

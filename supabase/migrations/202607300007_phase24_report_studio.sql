-- Phase 24: white-label report templates and server-side export history.
create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default Custom Template' check (char_length(trim(name)) between 1 and 120),
  branding jsonb not null default '{"primary_color":"#8b5e3c","accent_color":"#c78e69","logo_url":null,"typography":"serif"}',
  section_config jsonb not null default '{"executive_summary":true,"behavioral_matrix":true,"stress_profile":true,"team_communication":true,"custom_notes":true}',
  custom_content jsonb not null default '{"intro_notes":"","executive_commentary":"","footer_text":"","disclaimer":""}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  template_id uuid references public.report_templates(id) on delete set null,
  file_path text,
  created_at timestamptz not null default now()
);
create index report_templates_org_id_idx on public.report_templates(org_id);
create index report_templates_coach_id_idx on public.report_templates(coach_id, updated_at desc);
create index report_exports_report_id_idx on public.report_exports(report_id, created_at desc);
create index report_exports_template_id_idx on public.report_exports(template_id, created_at desc);
create unique index report_templates_one_default_per_scope_idx on public.report_templates (coach_id, coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid)) where is_default;
create trigger report_templates_set_updated_at before update on public.report_templates for each row execute procedure public.set_updated_at();

alter table public.report_templates enable row level security;
alter table public.report_exports enable row level security;
create policy "coaches and org admins read report templates" on public.report_templates for select using (
  coach_id = auth.uid() or (org_id is not null and public.can_manage_organization(org_id))
);
create policy "coaches and org admins insert report templates" on public.report_templates for insert with check (
  coach_id = auth.uid() or (org_id is not null and public.can_manage_organization(org_id))
);
create policy "coaches and org admins update report templates" on public.report_templates for update using (
  coach_id = auth.uid() or (org_id is not null and public.can_manage_organization(org_id))
) with check (coach_id = auth.uid() or (org_id is not null and public.can_manage_organization(org_id)));
create policy "coaches and org admins delete report templates" on public.report_templates for delete using (
  coach_id = auth.uid() or (org_id is not null and public.can_manage_organization(org_id))
);
create policy "template collaborators read report exports" on public.report_exports for select using (
  exists (select 1 from public.report_templates t where t.id = template_id and (t.coach_id = auth.uid() or (t.org_id is not null and public.can_manage_organization(t.org_id))))
);
create policy "template collaborators insert report exports" on public.report_exports for insert with check (
  exists (select 1 from public.report_templates t where t.id = template_id and (t.coach_id = auth.uid() or (t.org_id is not null and public.can_manage_organization(t.org_id))))
);

insert into storage.buckets (id, name, public) values ('report-assets', 'report-assets', false) on conflict (id) do nothing;
create policy "coaches upload their report assets" on storage.objects for insert to authenticated with check (
  bucket_id = 'report-assets' and owner_id = auth.uid()::text
);
create policy "coaches read their report assets" on storage.objects for select to authenticated using (
  bucket_id = 'report-assets' and owner_id = auth.uid()::text
);
create policy "coaches update their report assets" on storage.objects for update to authenticated using (
  bucket_id = 'report-assets' and owner_id = auth.uid()::text
) with check (bucket_id = 'report-assets' and owner_id = auth.uid()::text);
create policy "coaches delete their report assets" on storage.objects for delete to authenticated using (
  bucket_id = 'report-assets' and owner_id = auth.uid()::text
);

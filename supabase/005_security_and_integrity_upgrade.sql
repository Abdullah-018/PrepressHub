-- PrepressHub v1.1 security and data-integrity upgrade.
-- Run this once on an existing v1.0 Supabase project. New projects should run
-- 001_schema_and_security.sql instead, because it already includes these changes.

begin;

-- Previously self-declared domains are no longer trusted. An administrator
-- must set them again after reviewing the company proof document.
update public.companies set email_domain=null where email_domain is not null;
update public.profiles set company_email_verified=false where company_email_verified=true;

update public.companies
set worker_capacity_max=worker_capacity_min
where worker_capacity_max<>0 and worker_capacity_max<worker_capacity_min;

update public.advertisements
set target_url=null
where target_url is not null and target_url !~* '^https?://';

do $$
begin
  if not exists(select 1 from pg_constraint where conname='companies_capacity_order') then
    alter table public.companies add constraint companies_capacity_order
      check (worker_capacity_max=0 or worker_capacity_max>=worker_capacity_min);
  end if;
  if not exists(select 1 from pg_constraint where conname='advertisements_target_url_http') then
    alter table public.advertisements add constraint advertisements_target_url_http
      check (target_url is null or target_url ~* '^https?://');
  end if;
end $$;

create or replace function public.enforce_admin_company_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.email_domain := case when tg_op='UPDATE' then old.email_domain else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists companies_enforce_admin_domain on public.companies;
create trigger companies_enforce_admin_domain before insert or update of email_domain on public.companies
for each row execute function public.enforce_admin_company_domain();

create or replace function public.replace_employment_history(
  p_current_company_name text,
  p_current_designation text,
  p_location text default null,
  p_previous jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_item jsonb;
  v_start date;
  v_end date;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_current_company_name),'') is null or nullif(trim(p_current_designation),'') is null then
    raise exception 'Current company and designation are required';
  end if;
  if jsonb_typeof(coalesce(p_previous,'[]'::jsonb)) <> 'array' then raise exception 'Previous experience must be an array'; end if;
  if jsonb_array_length(coalesce(p_previous,'[]'::jsonb)) > 20 then raise exception 'A maximum of 20 previous roles is allowed'; end if;

  v_company_id := public.find_or_create_company(trim(p_current_company_name),p_location);
  delete from public.employment_history where user_id=auth.uid();
  insert into public.employment_history(user_id,company_id,company_name_snapshot,designation,is_current)
  values(auth.uid(),v_company_id,trim(p_current_company_name),trim(p_current_designation),true);

  for v_item in select value from jsonb_array_elements(coalesce(p_previous,'[]'::jsonb)) loop
    if nullif(trim(v_item->>'company_name'),'') is not null and nullif(trim(v_item->>'designation'),'') is not null then
      v_company_id := public.find_or_create_company(trim(v_item->>'company_name'),p_location);
      v_start := case when nullif(v_item->>'start_date','') is null then null else (v_item->>'start_date')::date end;
      v_end := case when nullif(v_item->>'end_date','') is null then null else (v_item->>'end_date')::date end;
      if v_start is not null and v_end is not null and v_end<v_start then raise exception 'Experience end date cannot be before start date'; end if;
      insert into public.employment_history(user_id,company_id,company_name_snapshot,designation,is_current,start_date,end_date)
      values(auth.uid(),v_company_id,trim(v_item->>'company_name'),trim(v_item->>'designation'),false,v_start,v_end);
    end if;
  end loop;
end;
$$;

create or replace function public.admin_set_company_domain(p_id uuid,p_domain text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if not exists(select 1 from public.companies where id=p_id) then raise exception 'Company not found'; end if;
  update public.companies set email_domain=nullif(lower(trim(coalesce(p_domain,''))),''),updated_at=now() where id=p_id;
  perform public.sync_company_email_badge(p.id)
  from public.profiles p
  where p.company_id=p_id
     or exists(select 1 from public.employment_history e where e.user_id=p.id and e.company_id=p_id and e.is_current);
  insert into public.moderation_actions(admin_id,target_type,target_id,action,note)
  values(auth.uid(),'company',p_id,'set_verified_domain',nullif(lower(trim(coalesce(p_domain,''))),''));
end;
$$;

drop policy if exists "jobs approved user insert" on public.jobs;
create policy "jobs approved user insert" on public.jobs for insert to authenticated
with check (
  poster_id=auth.uid() and company_id is not null and is_real_confirmed=true and
  exists(
    select 1 from public.profiles p
    join public.companies c on c.id=p.company_id
    where p.id=auth.uid() and p.account_type='company' and p.status='approved'
      and p.company_email_verified=true and c.id=jobs.company_id and c.status='approved'
      and c.claimed_by=auth.uid() and jobs.company_name=c.name
  )
);

revoke update(email_domain) on public.companies from authenticated;
grant update(location,worker_capacity_min,worker_capacity_max,compliance,provident_fund,salary_day_from,salary_day_to,overtime_paid,weekly_holiday,festival_bonus,night_shift,transport,canteen,website,updated_at) on public.companies to authenticated;
revoke execute on function public.find_or_create_company(text,text) from authenticated;
grant execute on function public.replace_employment_history(text,text,text,jsonb) to authenticated;
grant execute on function public.admin_set_company_domain(uuid,text) to authenticated;

commit;

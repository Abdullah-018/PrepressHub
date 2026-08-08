-- PrepressHub production schema for Supabase
-- Run this whole file once in Supabase Dashboard > SQL Editor.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
set local search_path = public, extensions;

create or replace function public.normalize_company_name(value text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := lower(coalesce(value, ''));
  v := regexp_replace(v, '[^[:alnum:]]+', ' ', 'g');
  v := regexp_replace(v, '\m(ltd|limited|pvt|private|plc|company|co|bangladesh|bd)\M', ' ', 'gi');
  v := regexp_replace(v, '\s+', ' ', 'g');
  return trim(v);
end;
$$;

create or replace function public.email_domain(value text)
returns text
language sql
immutable
as $$
  select lower(split_part(coalesce(value, ''), '@', 2));
$$;

create or replace function public.is_public_email_domain(value text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(value,'')) = any(array[
    'gmail.com','googlemail.com','yahoo.com','yahoo.co.uk','outlook.com','hotmail.com',
    'live.com','msn.com','icloud.com','me.com','aol.com','proton.me','protonmail.com',
    'mail.com','gmx.com','gmx.net','ymail.com','zoho.com'
  ]);
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text generated always as (public.normalize_company_name(name)) stored,
  location text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by uuid references auth.users(id) on delete set null,
  claimed_by uuid references auth.users(id) on delete set null,
  is_claimed boolean not null default false,
  duplicate_candidate_id uuid references public.companies(id) on delete set null,
  worker_capacity_min integer not null default 0 check (worker_capacity_min >= 0),
  worker_capacity_max integer not null default 0 check (worker_capacity_max >= 0),
  constraint companies_capacity_order check (worker_capacity_max = 0 or worker_capacity_max >= worker_capacity_min),
  compliance boolean not null default false,
  provident_fund boolean not null default false,
  salary_day_from smallint check (salary_day_from between 1 and 31),
  salary_day_to smallint check (salary_day_to between 1 and 31),
  overtime_paid boolean not null default false,
  weekly_holiday boolean not null default false,
  festival_bonus boolean not null default false,
  night_shift boolean not null default false,
  transport boolean not null default false,
  canteen boolean not null default false,
  website text,
  email_domain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists companies_normalized_name_unique
  on public.companies(normalized_name)
  where normalized_name <> '';
create index if not exists companies_name_trgm_idx on public.companies using gin (normalized_name gin_trgm_ops);
create index if not exists companies_status_idx on public.companies(status);

create or replace function public.sanitize_company_email_domain()
returns trigger
language plpgsql
as $$
begin
  new.email_domain := lower(trim(coalesce(new.email_domain,'')));
  new.email_domain := regexp_replace(new.email_domain, '^https?://', '', 'i');
  new.email_domain := split_part(new.email_domain, '/', 1);
  if new.email_domain = '' or public.is_public_email_domain(new.email_domain) then
    new.email_domain := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists companies_sanitize_email_domain on public.companies;
create trigger companies_sanitize_email_domain before insert or update of email_domain on public.companies
for each row execute function public.sanitize_company_email_domain();

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

create table if not exists public.company_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  alias text not null,
  normalized_alias text generated always as (public.normalize_company_name(alias)) stored,
  created_at timestamptz not null default now(),
  unique(normalized_alias)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null default 'professional' check (account_type in ('professional','company')),
  role text not null default 'user' check (role in ('user','company','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','banned')),
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  location text,
  bio text,
  skills text[] not null default '{}',
  portfolio_url text,
  has_cv boolean not null default false,
  company_email_verified boolean not null default false,
  profile_completion smallint not null default 0 check (profile_completion between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_company_idx on public.profiles(company_id);

create table if not exists public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  cv_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_private (
  company_id uuid primary key references public.companies(id) on delete cascade,
  proof_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration safety for an earlier draft that stored proof_path on the public company row.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='companies' and column_name='proof_path'
  ) then
    execute 'insert into public.company_private(company_id,proof_path) select id,proof_path from public.companies where proof_path is not null on conflict(company_id) do update set proof_path=excluded.proof_path,updated_at=now()';
    execute 'alter table public.companies drop column proof_path';
  end if;
end $$;

create table if not exists public.company_claims (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  evidence_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, claimant_id)
);

create table if not exists public.employment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  company_name_snapshot text not null,
  designation text not null,
  is_current boolean not null default false,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists one_current_employment_per_user on public.employment_history(user_id) where is_current;
create index if not exists employment_company_current_idx on public.employment_history(company_id,is_current);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  is_anonymous boolean not null default true,
  employment_status text not null check (employment_status in ('current','former')),
  team_leader_name text not null,
  night_shift boolean not null default false,
  salary_benefits smallint not null check (salary_benefits between 1 and 5),
  work_environment smallint not null check (work_environment between 1 and 5),
  management smallint not null check (management between 1 and 5),
  career_growth smallint not null check (career_growth between 1 and 5),
  work_life_balance smallint not null check (work_life_balance between 1 and 5),
  team_lead_rating smallint not null check (team_lead_rating between 1 and 5),
  overall_rating numeric(3,2) not null default 0,
  pros text not null,
  cons text not null,
  advice text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, reviewer_id)
);
create index if not exists reviews_company_status_idx on public.reviews(company_id,status);

-- Public review feed deliberately masks reviewer identity for anonymous reviews.
-- Direct access to the reviews table is limited to the reviewer and administrators.
create or replace view public.review_feed
with (security_barrier = true)
as
select
  r.id,
  r.company_id,
  case when r.is_anonymous then null else r.reviewer_id end as reviewer_id,
  case when r.is_anonymous then null else p.full_name end as reviewer_name,
  r.is_anonymous,
  r.employment_status,
  r.team_leader_name,
  r.night_shift,
  r.salary_benefits,
  r.work_environment,
  r.management,
  r.career_growth,
  r.work_life_balance,
  r.team_lead_rating,
  r.overall_rating,
  r.pros,
  r.cons,
  r.advice,
  r.created_at
from public.reviews r
left join public.profiles p on p.id=r.reviewer_id
where r.status='approved';

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null,
  location text not null,
  salary text not null,
  designation text not null,
  description text not null,
  is_real_confirmed boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_status_idx on public.jobs(status,created_at desc);

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  advertiser_name text not null,
  contact_email text not null,
  phone text not null,
  placement text not null default 'directory' check (placement in ('homepage','directory','company')),
  description text not null,
  target_url text constraint advertisements_target_url_http check (target_url is null or target_url ~* '^https?://'),
  banner_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists advertisements_status_idx on public.advertisements(status,placement,created_at desc);

create table if not exists public.moderation_actions (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

create or replace function public.is_approved_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.set_review_overall()
returns trigger
language plpgsql
as $$
declare
  v numeric;
begin
  v := (new.salary_benefits + new.work_environment + new.management + new.career_growth + new.work_life_balance + new.team_lead_rating) / 6.0;
  if new.night_shift then
    v := least(v, 2.50);
  end if;
  new.overall_rating := round(v, 2);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reviews_set_overall on public.reviews;
create trigger reviews_set_overall before insert or update on public.reviews
for each row execute function public.set_review_overall();

create or replace function public.find_duplicate_candidate(p_name text)
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select id
  from public.companies
  where similarity(normalized_name, public.normalize_company_name(p_name)) >= 0.60
  order by similarity(normalized_name, public.normalize_company_name(p_name)) desc
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_type text := coalesce(new.raw_user_meta_data->>'account_type','professional');
  v_company_id uuid;
  v_company_name text;
  v_duplicate uuid;
begin
  insert into public.profiles(id,account_type,role,status,full_name,location)
  values(
    new.id,
    case when v_type='company' then 'company' else 'professional' end,
    case when v_type='company' then 'company' else 'user' end,
    'pending',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'location'
  )
  on conflict(id) do nothing;

  insert into public.profile_private(id,phone)
  values(new.id,new.raw_user_meta_data->>'phone')
  on conflict(id) do update set phone=excluded.phone,updated_at=now();

  if v_type='professional' then
    v_company_name := nullif(trim(new.raw_user_meta_data->>'current_company'),'');
    if v_company_name is not null then
      select id into v_company_id from public.companies
      where normalized_name = public.normalize_company_name(v_company_name)
      limit 1;
      if v_company_id is null then
        v_duplicate := public.find_duplicate_candidate(v_company_name);
        begin
          insert into public.companies(name,location,status,created_by,duplicate_candidate_id)
          values(v_company_name,new.raw_user_meta_data->>'location','pending',new.id,v_duplicate)
          returning id into v_company_id;
        exception when unique_violation then
          select id into v_company_id from public.companies
          where normalized_name = public.normalize_company_name(v_company_name)
          limit 1;
        end;
      end if;
      insert into public.employment_history(user_id,company_id,company_name_snapshot,designation,is_current)
      values(new.id,v_company_id,v_company_name,coalesce(new.raw_user_meta_data->>'current_designation',''),true)
      on conflict do nothing;
    end if;
  else
    v_company_name := nullif(trim(new.raw_user_meta_data->>'company_name'),'');
    select id into v_company_id from public.companies
      where normalized_name = public.normalize_company_name(v_company_name)
      limit 1;
    if v_company_id is null then
      v_duplicate := public.find_duplicate_candidate(v_company_name);
      begin
        insert into public.companies(
          name,location,status,created_by,claimed_by,is_claimed,duplicate_candidate_id,
          worker_capacity_min,worker_capacity_max,compliance,provident_fund,
          salary_day_from,salary_day_to,overtime_paid,weekly_holiday,festival_bonus,
          night_shift,transport,canteen,website,email_domain
        ) values (
          v_company_name,new.raw_user_meta_data->>'company_location','pending',new.id,new.id,true,v_duplicate,
          coalesce(nullif(new.raw_user_meta_data->>'worker_capacity_min','')::integer,0),
          coalesce(nullif(new.raw_user_meta_data->>'worker_capacity_max','')::integer,0),
          coalesce((new.raw_user_meta_data->>'compliance')::boolean,false),
          coalesce((new.raw_user_meta_data->>'provident_fund')::boolean,false),
          nullif(new.raw_user_meta_data->>'salary_day_from','')::smallint,
          nullif(new.raw_user_meta_data->>'salary_day_to','')::smallint,
          coalesce((new.raw_user_meta_data->>'overtime_paid')::boolean,false),
          coalesce((new.raw_user_meta_data->>'weekly_holiday')::boolean,false),
          coalesce((new.raw_user_meta_data->>'festival_bonus')::boolean,false),
          coalesce((new.raw_user_meta_data->>'night_shift')::boolean,false),
          coalesce((new.raw_user_meta_data->>'transport')::boolean,false),
          coalesce((new.raw_user_meta_data->>'canteen')::boolean,false),
          new.raw_user_meta_data->>'website',null
        ) returning id into v_company_id;
      exception when unique_violation then
        select id into v_company_id from public.companies
        where normalized_name = public.normalize_company_name(v_company_name)
        limit 1;
        insert into public.company_claims(company_id,claimant_id,status)
        values(v_company_id,new.id,'pending')
        on conflict(company_id,claimant_id) do nothing;
      end;
    else
      insert into public.company_claims(company_id,claimant_id,status)
      values(v_company_id,new.id,'pending')
      on conflict(company_id,claimant_id) do nothing;
    end if;
    update public.profiles set company_id=v_company_id where id=new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.find_company_matches(p_name text)
returns table(id uuid,name text,location text,similarity_score real)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.id,c.name,c.location,similarity(c.normalized_name,public.normalize_company_name(p_name))::real
  from public.companies c
  where c.status='approved'
    and (c.normalized_name % public.normalize_company_name(p_name)
      or c.normalized_name like '%'||public.normalize_company_name(p_name)||'%')
  order by similarity_score desc, c.name
  limit 8;
$$;

create or replace function public.find_or_create_company(p_name text,p_location text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_duplicate uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into v_id from public.companies
  where normalized_name=public.normalize_company_name(p_name)
  limit 1;
  if v_id is null then
    v_duplicate := public.find_duplicate_candidate(p_name);
    begin
      insert into public.companies(name,location,status,created_by,duplicate_candidate_id)
      values(trim(p_name),p_location,'pending',auth.uid(),v_duplicate)
      returning id into v_id;
    exception when unique_violation then
      select id into v_id from public.companies
      where normalized_name=public.normalize_company_name(p_name)
      limit 1;
    end;
  end if;
  return v_id;
end;
$$;

-- Replace a professional's employment history atomically so a failed insert
-- never destroys the previously saved history.
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
      if v_start is not null and v_end is not null and v_end < v_start then raise exception 'Experience end date cannot be before start date'; end if;
      insert into public.employment_history(user_id,company_id,company_name_snapshot,designation,is_current,start_date,end_date)
      values(auth.uid(),v_company_id,trim(v_item->>'company_name'),trim(v_item->>'designation'),false,v_start,v_end);
    end if;
  end loop;
end;
$$;

create or replace function public.sync_company_email_badge(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_domain text;
  v_company_domain text;
  v_company_id uuid;
begin
  if auth.uid() <> p_user_id and not public.is_admin() then raise exception 'Not allowed'; end if;
  select email into v_email from auth.users where id=p_user_id;
  select company_id into v_company_id from public.profiles where id=p_user_id;
  if v_company_id is null then
    select company_id into v_company_id from public.employment_history
    where user_id=p_user_id and is_current limit 1;
  end if;
  select lower(email_domain) into v_company_domain from public.companies where id=v_company_id;
  v_domain := public.email_domain(v_email);
  update public.profiles
  set company_email_verified = (
    v_company_domain is not null and v_company_domain <> '' and
    not public.is_public_email_domain(v_domain) and
    (v_domain = v_company_domain or v_domain like '%.'||v_company_domain)
  ), updated_at=now()
  where id=p_user_id;
  return coalesce(v_company_domain is not null and not public.is_public_email_domain(v_domain) and (v_domain=v_company_domain or v_domain like '%.'||v_company_domain),false);
end;
$$;

create or replace function public.get_cv_path(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if auth.uid()<>p_user_id and not public.is_admin() and not public.is_approved_account() then
    raise exception 'Approved account required';
  end if;
  select cv_path into v_path from public.profile_private where id=p_user_id;
  return v_path;
end;
$$;

create or replace function public.admin_set_profile_status(p_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('pending','approved','rejected','banned') then raise exception 'Invalid status'; end if;
  update public.profiles set status=p_status,updated_at=now() where id=p_id;
  insert into public.moderation_actions(admin_id,target_type,target_id,action) values(auth.uid(),'profile',p_id,p_status);
  if p_status='approved' then perform public.sync_company_email_badge(p_id); end if;
end;
$$;

create or replace function public.admin_set_company_status(p_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'Invalid status'; end if;
  update public.companies set status=p_status,updated_at=now() where id=p_id;
  if p_status='approved' then
    perform public.sync_company_email_badge(p.id)
    from public.profiles p
    where p.company_id=p_id
       or exists(select 1 from public.employment_history e where e.user_id=p.id and e.company_id=p_id and e.is_current);
  end if;
  insert into public.moderation_actions(admin_id,target_type,target_id,action) values(auth.uid(),'company',p_id,p_status);
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

create or replace function public.admin_set_claim_status(p_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.company_claims%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Invalid status'; end if;
  select * into v_claim from public.company_claims where id=p_id for update;
  update public.company_claims set status=p_status,updated_at=now() where id=p_id;
  if p_status='approved' then
    if exists(
      select 1 from public.companies
      where id=v_claim.company_id
        and claimed_by is not null
        and claimed_by<>v_claim.claimant_id
    ) then
      raise exception 'This company is already claimed by another approved account';
    end if;
    update public.companies set claimed_by=v_claim.claimant_id,is_claimed=true,updated_at=now() where id=v_claim.company_id;
    update public.profiles set company_id=v_claim.company_id where id=v_claim.claimant_id;
  end if;
  insert into public.moderation_actions(admin_id,target_type,target_id,action) values(auth.uid(),'company_claim',p_id,p_status);
end;
$$;

create or replace function public.admin_moderate_content(p_kind text,p_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected','deleted') then raise exception 'Invalid status'; end if;
  if p_kind='reviews' then
    if p_status='deleted' then delete from public.reviews where id=p_id; else update public.reviews set status=p_status,updated_at=now() where id=p_id; end if;
  elsif p_kind='jobs' then
    if p_status='deleted' then delete from public.jobs where id=p_id; else update public.jobs set status=p_status,updated_at=now() where id=p_id; end if;
  elsif p_kind='advertisements' then
    if p_status='deleted' then delete from public.advertisements where id=p_id; else update public.advertisements set status=p_status,updated_at=now() where id=p_id; end if;
  else raise exception 'Unknown content type'; end if;
  insert into public.moderation_actions(admin_id,target_type,target_id,action) values(auth.uid(),p_kind,p_id,p_status);
end;
$$;

create or replace function public.admin_merge_companies(p_source uuid,p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_name text;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_source=p_target then raise exception 'Source and target must differ'; end if;
  select name into v_source_name from public.companies where id=p_source;
  if v_source_name is null or not exists(select 1 from public.companies where id=p_target) then raise exception 'Company not found'; end if;
  insert into public.company_aliases(company_id,alias) values(p_target,v_source_name) on conflict(normalized_alias) do nothing;
  insert into public.company_private(company_id,proof_path)
  select p_target,proof_path from public.company_private where company_id=p_source and proof_path is not null
  on conflict(company_id) do nothing;
  update public.employment_history set company_id=p_target where company_id=p_source;
  update public.reviews set company_id=p_target where company_id=p_source and not exists(
    select 1 from public.reviews r2 where r2.company_id=p_target and r2.reviewer_id=public.reviews.reviewer_id
  );
  delete from public.reviews where company_id=p_source;
  update public.jobs set company_id=p_target where company_id=p_source;
  update public.profiles set company_id=p_target where company_id=p_source;
  update public.company_claims set company_id=p_target where company_id=p_source and not exists(
    select 1 from public.company_claims c2 where c2.company_id=p_target and c2.claimant_id=public.company_claims.claimant_id
  );
  delete from public.company_claims where company_id=p_source;
  update public.companies set duplicate_candidate_id=null where duplicate_candidate_id=p_source;
  delete from public.companies where id=p_source;
  insert into public.moderation_actions(admin_id,target_type,target_id,action,note)
  values(auth.uid(),'company',p_target,'merge','Merged source '||p_source::text);
end;
$$;

create or replace function public.admin_delete_profile(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if exists(select 1 from public.profiles where id=p_id and role='admin') then raise exception 'Admin account cannot be deleted here'; end if;
  insert into public.moderation_actions(admin_id,target_type,target_id,action) values(auth.uid(),'profile',p_id,'delete');
  delete from auth.users where id=p_id;
end;
$$;

create or replace function public.admin_delete_company(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  insert into public.moderation_actions(admin_id,target_type,target_id,action) values(auth.uid(),'company',p_id,'delete');
  delete from public.companies where id=p_id;
end;
$$;

-- Row Level Security
-- Policy drops make this setup script safe to run again after a partial setup.
drop policy if exists "profiles public approved" on public.profiles;
drop policy if exists "profiles owner update" on public.profiles;
drop policy if exists "profile private owner or admin select" on public.profile_private;
drop policy if exists "profile private owner insert" on public.profile_private;
drop policy if exists "profile private owner update" on public.profile_private;
drop policy if exists "company private owner or admin select" on public.company_private;
drop policy if exists "company private owner insert" on public.company_private;
drop policy if exists "company private owner update" on public.company_private;
drop policy if exists "companies public approved" on public.companies;
drop policy if exists "company owner update" on public.companies;
drop policy if exists "admin company delete" on public.companies;
drop policy if exists "aliases public" on public.company_aliases;
drop policy if exists "aliases admin all" on public.company_aliases;
drop policy if exists "claims owner or admin select" on public.company_claims;
drop policy if exists "claims owner insert" on public.company_claims;
drop policy if exists "claims owner pending update" on public.company_claims;
drop policy if exists "employment public approved" on public.employment_history;
drop policy if exists "employment owner insert" on public.employment_history;
drop policy if exists "employment owner update" on public.employment_history;
drop policy if exists "employment owner delete" on public.employment_history;
drop policy if exists "reviews public approved" on public.reviews;
drop policy if exists "reviews owner or admin select" on public.reviews;
drop policy if exists "reviews approved user insert" on public.reviews;
drop policy if exists "reviews owner pending update" on public.reviews;
drop policy if exists "reviews owner pending delete" on public.reviews;
drop policy if exists "jobs public approved" on public.jobs;
drop policy if exists "jobs approved user insert" on public.jobs;
drop policy if exists "jobs owner pending update" on public.jobs;
drop policy if exists "jobs owner pending delete" on public.jobs;
drop policy if exists "ads public approved" on public.advertisements;
drop policy if exists "ads approved user insert" on public.advertisements;
drop policy if exists "ads owner pending update" on public.advertisements;
drop policy if exists "ads owner pending delete" on public.advertisements;
drop policy if exists "moderation admin select" on public.moderation_actions;

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.company_private enable row level security;
alter table public.companies enable row level security;
alter table public.company_aliases enable row level security;
alter table public.company_claims enable row level security;
alter table public.employment_history enable row level security;
alter table public.reviews enable row level security;
alter table public.jobs enable row level security;
alter table public.advertisements enable row level security;
alter table public.moderation_actions enable row level security;

-- Profiles
create policy "profiles public approved" on public.profiles for select to anon,authenticated
using (status='approved' or id=auth.uid() or public.is_admin());
create policy "profiles owner update" on public.profiles for update to authenticated
using (id=auth.uid()) with check (id=auth.uid());
create policy "profile private owner or admin select" on public.profile_private for select to authenticated
using (id=auth.uid() or public.is_admin());
create policy "profile private owner insert" on public.profile_private for insert to authenticated
with check (id=auth.uid());
create policy "profile private owner update" on public.profile_private for update to authenticated
using (id=auth.uid()) with check (id=auth.uid());

create policy "company private owner or admin select" on public.company_private for select to authenticated
using (public.is_admin() or exists(select 1 from public.companies c where c.id=company_id and c.claimed_by=auth.uid()));
create policy "company private owner insert" on public.company_private for insert to authenticated
with check (public.is_admin() or exists(select 1 from public.companies c where c.id=company_id and c.claimed_by=auth.uid()));
create policy "company private owner update" on public.company_private for update to authenticated
using (public.is_admin() or exists(select 1 from public.companies c where c.id=company_id and c.claimed_by=auth.uid()))
with check (public.is_admin() or exists(select 1 from public.companies c where c.id=company_id and c.claimed_by=auth.uid()));

-- Companies
create policy "companies public approved" on public.companies for select to anon,authenticated
using (status='approved' or created_by=auth.uid() or claimed_by=auth.uid() or public.is_admin());
create policy "company owner update" on public.companies for update to authenticated
using (claimed_by=auth.uid()) with check (claimed_by=auth.uid());
create policy "admin company delete" on public.companies for delete to authenticated using (public.is_admin());

create policy "aliases public" on public.company_aliases for select to anon,authenticated using (true);
create policy "aliases admin all" on public.company_aliases for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Claims
create policy "claims owner or admin select" on public.company_claims for select to authenticated
using (claimant_id=auth.uid() or public.is_admin());
create policy "claims owner insert" on public.company_claims for insert to authenticated
with check (claimant_id=auth.uid());
create policy "claims owner pending update" on public.company_claims for update to authenticated
using (claimant_id=auth.uid() and status='pending') with check (claimant_id=auth.uid() and status='pending');

-- Employment
create policy "employment public approved" on public.employment_history for select to anon,authenticated
using (user_id=auth.uid() or public.is_admin() or exists(select 1 from public.profiles p where p.id=user_id and p.status='approved'));
create policy "employment owner insert" on public.employment_history for insert to authenticated with check (user_id=auth.uid());
create policy "employment owner update" on public.employment_history for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "employment owner delete" on public.employment_history for delete to authenticated using (user_id=auth.uid());

-- Reviews
create policy "reviews owner or admin select" on public.reviews for select to authenticated
using (reviewer_id=auth.uid() or public.is_admin());
create policy "reviews approved user insert" on public.reviews for insert to authenticated
with check (reviewer_id=auth.uid() and public.is_approved_account());
create policy "reviews owner pending update" on public.reviews for update to authenticated
using (reviewer_id=auth.uid() and status='pending') with check (reviewer_id=auth.uid() and status='pending');
create policy "reviews owner pending delete" on public.reviews for delete to authenticated
using (reviewer_id=auth.uid() and status='pending');

-- Jobs
create policy "jobs public approved" on public.jobs for select to anon,authenticated
using (status='approved' or poster_id=auth.uid() or public.is_admin());
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
create policy "jobs owner pending update" on public.jobs for update to authenticated
using (poster_id=auth.uid() and status='pending') with check (poster_id=auth.uid() and status='pending');
create policy "jobs owner pending delete" on public.jobs for delete to authenticated
using (poster_id=auth.uid() and status='pending');

-- Advertisements
create policy "ads public approved" on public.advertisements for select to anon,authenticated
using (status='approved' or poster_id=auth.uid() or public.is_admin());
create policy "ads approved user insert" on public.advertisements for insert to authenticated
with check (poster_id=auth.uid() and public.is_approved_account());
create policy "ads owner pending update" on public.advertisements for update to authenticated
using (poster_id=auth.uid() and status='pending') with check (poster_id=auth.uid() and status='pending');
create policy "ads owner pending delete" on public.advertisements for delete to authenticated
using (poster_id=auth.uid() and status='pending');

create policy "moderation admin select" on public.moderation_actions for select to authenticated using (public.is_admin());

-- Grants. Do not grant secret/admin capabilities to client roles.
grant usage on schema public to anon,authenticated;
grant select on public.profiles,public.companies,public.company_aliases,public.employment_history,public.jobs,public.advertisements,public.review_feed to anon,authenticated;
grant select on public.reviews to authenticated;
grant select,insert,update on public.profile_private,public.company_private to authenticated;
grant select on public.company_claims,public.moderation_actions to authenticated;
grant insert,update,delete on public.employment_history,public.reviews,public.jobs,public.advertisements to authenticated;
grant insert on public.company_claims to authenticated;
grant update(evidence_path,updated_at) on public.company_claims to authenticated;
grant update(full_name,location,bio,skills,portfolio_url,has_cv,profile_completion,updated_at) on public.profiles to authenticated;
revoke update(email_domain) on public.companies from authenticated;
grant update(location,worker_capacity_min,worker_capacity_max,compliance,provident_fund,salary_day_from,salary_day_to,overtime_paid,weekly_holiday,festival_bonus,night_shift,transport,canteen,website,updated_at) on public.companies to authenticated;
grant execute on function public.find_company_matches(text) to anon,authenticated;
revoke execute on function public.find_or_create_company(text,text) from authenticated;
grant execute on function public.replace_employment_history(text,text,text,jsonb) to authenticated;
grant execute on function public.sync_company_email_badge(uuid) to authenticated;
grant execute on function public.get_cv_path(uuid) to authenticated;
grant execute on function public.admin_set_profile_status(uuid,text),public.admin_set_company_status(uuid,text),public.admin_set_company_domain(uuid,text),public.admin_set_claim_status(uuid,text),public.admin_moderate_content(text,uuid,text),public.admin_merge_companies(uuid,uuid),public.admin_delete_profile(uuid),public.admin_delete_company(uuid) to authenticated;

-- Ensure only the masked view is public; anonymous users cannot query raw review rows.
revoke all on public.reviews from anon;
grant select on public.review_feed to anon,authenticated;

-- Storage buckets
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('cvs','cvs',false,10485760,array['application/pdf']),
  ('company-proofs','company-proofs',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']),
  ('ad-banners','ad-banners',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "cv owner upload" on storage.objects;
drop policy if exists "cv owner update" on storage.objects;
drop policy if exists "cv approved preview" on storage.objects;
drop policy if exists "cv owner delete" on storage.objects;
drop policy if exists "proof owner upload" on storage.objects;
drop policy if exists "proof owner update" on storage.objects;
drop policy if exists "proof owner admin read" on storage.objects;
drop policy if exists "ad banner public read" on storage.objects;
drop policy if exists "ad banner owner upload" on storage.objects;
drop policy if exists "ad banner owner update" on storage.objects;
drop policy if exists "ad banner owner delete" on storage.objects;

create policy "cv owner upload" on storage.objects for insert to authenticated
with check (bucket_id='cvs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "cv owner update" on storage.objects for update to authenticated
using (bucket_id='cvs' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='cvs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "cv approved preview" on storage.objects for select to authenticated
using (bucket_id='cvs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin() or public.is_approved_account()));
create policy "cv owner delete" on storage.objects for delete to authenticated
using (bucket_id='cvs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

create policy "proof owner upload" on storage.objects for insert to authenticated
with check (bucket_id='company-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "proof owner update" on storage.objects for update to authenticated
using (bucket_id='company-proofs' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='company-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "proof owner admin read" on storage.objects for select to authenticated
using (bucket_id='company-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

create policy "ad banner public read" on storage.objects for select to anon,authenticated using (bucket_id='ad-banners');
create policy "ad banner owner upload" on storage.objects for insert to authenticated
with check (bucket_id='ad-banners' and (storage.foldername(name))[1]=auth.uid()::text and public.is_approved_account());
create policy "ad banner owner update" on storage.objects for update to authenticated
using (bucket_id='ad-banners' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='ad-banners' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "ad banner owner delete" on storage.objects for delete to authenticated
using (bucket_id='ad-banners' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

commit;

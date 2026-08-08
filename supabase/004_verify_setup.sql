-- PrepressHub setup verification
-- Run after 001_schema_and_security.sql and, after creating the admin, 002_promote_admin.sql.

-- 1) Required tables and safe public review facade
select table_schema, table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'profiles','profile_private','companies','company_private','company_aliases',
    'company_claims','employment_history','reviews','jobs','advertisements','moderation_actions'
  )
order by table_name;

select table_schema, table_name
from information_schema.views
where table_schema='public' and table_name='review_feed';

-- 2) RLS must be enabled on every exposed base table
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'profiles','profile_private','companies','company_private','company_aliases',
    'company_claims','employment_history','reviews','jobs','advertisements','moderation_actions'
  )
order by c.relname;

-- 3) Storage buckets and privacy settings
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('cvs','company-proofs','ad-banners')
order by id;

-- Expected: cvs=false, company-proofs=false, ad-banners=true.

-- 4) Installed extensions
select e.extname, n.nspname as installed_schema
from pg_extension e
join pg_namespace n on n.oid=e.extnamespace
where e.extname in ('pgcrypto','pg_trgm')
order by e.extname;

-- 5) Administrator status. This returns a row only after 002_promote_admin.sql succeeds.
select u.email, p.full_name, p.role, p.status
from auth.users u
join public.profiles p on p.id=u.id
where lower(u.email)=lower('abdullahyz018@gmail.com');

-- 6) No raw anonymous review identity should be available to anon.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='reviews' and grantee='anon';

-- Expected: no rows.

-- 7) v1.1 integrity functions and constraints
select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in ('replace_employment_history','admin_set_company_domain','enforce_admin_company_domain')
order by routine_name;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in ('companies_capacity_order','advertisements_target_url_http')
order by conname;

-- 8) Company users must not be able to update the verified email domain.
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema='public' and table_name='companies'
  and grantee='authenticated' and column_name='email_domain';

-- Expected: no rows.

-- 9) Storage policies and job insert policy should be present.
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where (schemaname='storage' and tablename='objects')
   or (schemaname='public' and tablename='jobs' and policyname='jobs approved user insert')
order by schemaname,tablename,policyname;

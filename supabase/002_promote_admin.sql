-- Run this AFTER creating/signing up the admin account in Supabase Auth.
-- The password must be created in Supabase Auth. Never place it in GitHub or config.js.

update public.profiles
set role = 'admin',
    status = 'approved',
    account_type = 'professional',
    full_name = coalesce(nullif(full_name,''),'Abdullah'),
    updated_at = now()
where id = (
  select id from auth.users
  where lower(email) = lower('abdullahyz018@gmail.com')
  limit 1
);

select id,email from auth.users where lower(email)=lower('abdullahyz018@gmail.com');
select id,full_name,role,status from public.profiles where role='admin';

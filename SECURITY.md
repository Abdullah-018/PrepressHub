# PrepressHub Security Notes

## Safe in frontend

- Supabase Project URL
- Supabase publishable/anon key

These are public by design. RLS must enforce access.

## Never expose

- Supabase secret key
- Supabase service-role key
- Database password
- Admin password
- SMTP password
- Cloudflare API token
- GitHub personal access token

## CV privacy

CV files are stored in the private `cvs` bucket. Approved accounts and administrators can request a short signed URL for preview. The interface contains no download button, but no browser-based system can guarantee that an authorised viewer will not save the network response, print the document or take screenshots.

## Administrator model

The frontend never receives a service-role key. Admin actions call narrowly scoped PostgreSQL `security definer` functions. Each function checks the signed-in user against `public.profiles.role = 'admin'` and `status = 'approved'`.

## Recommended production additions

- CAPTCHA on signup and login
- Custom SMTP
- Rate limits
- Content moderation workflow
- Malware scanning for uploaded files
- File-type signature validation
- Backups and retention policy
- Legal review of privacy, defamation and employment-review policies

## Anonymous reviews

Public pages read from the `review_feed` facade, which removes the reviewer ID and name when a review is anonymous. Raw `reviews` rows are selectable only by the reviewer and administrators.

## Company verification documents

Company proof files are stored in the private `company-proofs` bucket. Their paths are stored in `company_private` or on a pending company claim, not on the public company row. Only the claiming account and administrators can read them.

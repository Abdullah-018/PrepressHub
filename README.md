# PrepressHub

Production-oriented static web application designed for:

- **GitHub** — source control
- **Cloudflare Pages** — frontend hosting and automatic deployment
- **Supabase** — Auth, PostgreSQL database, Storage and Row Level Security

The frontend does not require Python or a traditional web server. It is plain HTML, CSS and JavaScript. Supabase provides the backend.

## Included modules

- বাংলা ও English language switching
- Professional/User signup and Company signup
- Email/password authentication through Supabase Auth
- Email confirmation support
- Admin approval for every account
- Pending, approved, rejected and banned account states
- Private PDF CV upload to Supabase Storage
- CV preview for approved users and company accounts without a download button
- Admin CV preview for pending applications
- Profile completion calculation; portfolio is optional
- Current company and designation
- Multiple previous companies with separate designation and dates
- Duplicate-safe company creation
- Existing-company claim requests
- Similar-company suggestions using PostgreSQL `pg_trgm`
- Admin merge for duplicate companies
- Company employee count based on approved current professional profiles
- Employee names and designations on company pages
- Company reviews with a named team leader
- Night shift flag and automatic rating cap at 2.50
- Jobs with required company, location, salary, designation and description
- Fake-job warning and account banning
- Advertisement submission and admin moderation
- Admin status moderation, deletion and audit log
- Company email badge when the authenticated email domain matches the company’s official domain
- Supabase RLS policies and private/public Storage policies
- Anonymous-review identity masking through a safe public review feed
- Private company verification documents visible only to the owner and administrator
- Cloudflare security headers and a Bengali deployment guide

---

# 1. What you need

Create free accounts at:

- GitHub: https://github.com/
- Cloudflare: https://dash.cloudflare.com/
- Supabase: https://supabase.com/dashboard

Install on Windows:

- Git: https://git-scm.com/download/win
- Optional: GitHub Desktop: https://desktop.github.com/
- Optional for local testing: Node.js LTS: https://nodejs.org/

---

# 2. Create the Supabase project

1. Open Supabase Dashboard.
2. Click **New project**.
3. Choose an organisation.
4. Project name: `prepresshub`
5. Create a strong database password and save it privately.
6. Select the nearest available region.
7. Wait until the project is ready.

## Run the database setup

1. Open **SQL Editor**.
2. Open this project file:
   `supabase/001_schema_and_security.sql`
3. Copy the entire SQL.
4. Paste it into SQL Editor.
5. Click **Run**.
6. Confirm that the query completes without errors.
7. Run `supabase/004_verify_setup.sql` and confirm every listed base table has RLS enabled.

This creates the database tables, triggers, functions, RLS policies and Storage buckets.

## Get the browser-safe API values

1. Open **Project Settings → API**.
2. Copy:
   - Project URL
   - Publishable key / anon key
3. Open `config.js` in the project.
4. Replace the two placeholder values:

```js
window.PREPRESSHUB_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_PUBLISHABLE_KEY",
  SITE_NAME: "PrepressHub",
  ADMIN_EMAIL: "abdullahyz018@gmail.com"
};
```

The publishable key is expected to be visible in browser code. Security comes from RLS. **Never place the Supabase secret key or service-role key in this repository.**

---

# 3. Configure Supabase Auth

Open **Authentication → URL Configuration**.

For the first deployment, you do not know the final Pages URL yet. You may initially use:

- Site URL: `http://localhost:8788`
- Redirect URL: `http://localhost:8788/**`

After Cloudflare deployment, add:

- `https://YOUR-PROJECT.pages.dev/**`
- Your custom domain later, for example `https://prepresshub.com/**`

Keep **Confirm email** enabled for production.

## Signup CV behaviour with email confirmation

At signup, the selected CV/proof file is temporarily stored in that browser’s IndexedDB. After the user confirms the email and returns to the same browser, the application uploads the file to Supabase Storage.

If confirmation is completed on another device, the user can upload the CV again from **My Profile**.

---

# 4. Create the administrator account safely

Do **not** put the admin password in GitHub or JavaScript.

1. Open your deployed/local PrepressHub site.
2. Use Professional Signup with:
   - Email: `abdullahyz018@gmail.com`
   - Your chosen admin password
3. Confirm the email.
4. Return to Supabase **SQL Editor**.
5. Run:
   `supabase/002_promote_admin.sql`
6. Log out and log in again.
7. The **Admin** dashboard will now be available.

The SQL promotes only the account with the configured admin email. The password stays inside Supabase Auth.

---

# 5. Test locally

Because this project uses ES modules, do not open `index.html` with a `file:///` URL.

## Recommended Cloudflare-compatible test

Install Node.js, open Command Prompt inside the project folder, then run:

```bash
npx wrangler pages dev . --port 8788
```

Open:

```text
http://localhost:8788
```

A Windows helper is included:

```text
Start_Local_Cloudflare.bat
```

---

# 6. Upload the project to GitHub

## Method A — Git command line

Create an empty repository on GitHub named `prepresshub`. Do not initialise it with another README.

Open Git Bash inside the extracted project folder and run:

```bash
git init -b main
git add .
git commit -m "Initial PrepressHub production setup"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/prepresshub.git
git push -u origin main
```

## Method B — GitHub Desktop

1. Open GitHub Desktop.
2. **File → Add Local Repository**.
3. Select the extracted project folder.
4. If prompted, create a Git repository.
5. Commit all files.
6. Click **Publish repository**.
7. Private repository is recommended while developing.

---

# 7. Deploy through Cloudflare Pages

1. Open Cloudflare Dashboard.
2. Go to **Workers & Pages**.
3. Click **Create application**.
4. Select **Pages**.
5. Select **Connect to Git** / **Import an existing Git repository**.
6. Authorise GitHub and choose the `prepresshub` repository.
7. Build settings:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | `exit 0` |
| Build output directory | `.` |
| Root directory | leave blank |

8. Click **Save and Deploy**.
9. Cloudflare will provide a URL similar to:
   `https://prepresshub.pages.dev`

Every future push to the `main` branch will automatically redeploy the site.

---

# 8. Update Supabase URLs after deployment

Return to Supabase:

**Authentication → URL Configuration**

Set:

- Site URL: `https://YOUR-PROJECT.pages.dev`
- Redirect URL: `https://YOUR-PROJECT.pages.dev/**`

Keep the localhost redirect while you are still testing locally.

---

# 9. Custom domain

In Cloudflare Pages:

1. Open your Pages project.
2. Go to **Custom domains**.
3. Click **Set up a custom domain**.
4. Add your domain, for example `prepresshub.com`.
5. If the domain is already managed by Cloudflare, the DNS record is normally configured automatically.
6. Add the custom domain to Supabase Site URL and Redirect URLs.

---

# 10. First complete test

Test in this order:

1. Professional signup
2. Email confirmation
3. CV upload
4. Admin approves professional
5. Professional logs in
6. Profile becomes 100% without portfolio
7. Company signup
8. Existing company name creates a claim instead of a duplicate
9. Admin approves company/claim
10. Company email-domain badge appears after the domain matches
11. Professional review with team-lead name and night-shift flag
12. Admin approves review
13. Job submission and approval
14. Advertisement submission and approval
15. Approved user/company previews another professional’s CV
16. Admin merges a deliberately created similar company

---

# 11. Security rules you must not break

- Never commit a Supabase secret key or service-role key.
- Never hard-code an admin password.
- Keep RLS enabled on every exposed table.
- Keep CV and company-proof buckets private.
- Only the advertisement banner bucket is public.
- Run Supabase Security Advisor after schema changes.
- Do not add a broad RLS policy such as `using (true)` for private tables.
- Review moderation and deletion must stay inside the provided admin RPC functions.
- CV download cannot be made technically impossible in a web browser. The UI removes the download button and uses short signed URLs, but a determined authorised viewer can still capture the file or take screenshots.

---

# 12. Updating the website later

Edit files locally, then:

```bash
git add .
git commit -m "Describe the update"
git push
```

Cloudflare Pages will deploy the new commit automatically.

---

# Project structure

```text
PrepressHub/
├── index.html
├── config.js
├── config.example.js
├── _redirects
├── _headers
├── assets/
│   ├── app.js
│   ├── styles.css
│   └── supabase.js
├── supabase/
│   ├── 001_schema_and_security.sql
│   ├── 002_promote_admin.sql
│   ├── 003_optional_email_templates.md
│   └── 004_verify_setup.sql
├── Start_Local_Cloudflare.bat
├── DEPLOYMENT_GUIDE_BN.md
├── QUICK_START_BN.txt
├── SECURITY.md
└── README.md
```


# PrepressHub: GitHub + Cloudflare Pages + Supabase সম্পূর্ণ সেটআপ গাইড

এই প্যাকেজে frontend, database schema, authentication, storage policy, admin moderation এবং deployment configuration একসঙ্গে দেওয়া আছে। Python server লাগবে না।

## প্রথমে যা লাগবে

1. GitHub account
2. Cloudflare account
3. Supabase account
4. Windows-এ Git
5. Local test করতে Node.js LTS

## ধাপ ১: ZIP extract করুন

ZIP extract করে folder-এর নাম `prepresshub` রাখুন। মূল folder-এর ভেতরে `index.html`, `config.js`, `assets`, `supabase` ইত্যাদি সরাসরি থাকতে হবে। আরেকটি nested folder-এর মধ্যে রাখবেন না।

## ধাপ ২: Supabase project তৈরি করুন

1. Supabase Dashboard খুলুন।
2. **New project** চাপুন।
3. Project name দিন `prepresshub`।
4. শক্ত database password দিন এবং password manager-এ রাখুন।
5. কাছের region নির্বাচন করুন।
6. Project ready হওয়া পর্যন্ত অপেক্ষা করুন।

## ধাপ ৩: Database, RLS ও Storage তৈরি করুন

1. Supabase Dashboard → **SQL Editor**।
2. প্যাকেজের `supabase/001_schema_and_security.sql` খুলুন।
3. পুরো SQL copy করে SQL Editor-এ paste করুন।
4. **Run** চাপুন।
5. Error এলে দ্বিতীয়বার অন্ধভাবে run করবেন না; error text সংরক্ষণ করুন।
6. সফল হলে `supabase/004_verify_setup.sql` run করুন।
7. Verification output-এ সব base table-এর `rls_enabled` অবশ্যই `true` হতে হবে।
8. Storage bucket expected result:
   - `cvs` → private
   - `company-proofs` → private
   - `ad-banners` → public

## ধাপ ৪: Supabase Project URL ও Publishable Key বসান

1. Supabase → **Project Settings → API Keys**।
2. Project URL copy করুন।
3. Publishable key copy করুন। পুরোনো project হলে anon key দেখা যেতে পারে; frontend-এর জন্য browser-safe key-টাই ব্যবহার করুন।
4. `config.js` খুলুন।
5. Placeholder বদলান:

```js
window.PREPRESSHUB_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_PUBLISHABLE_KEY",
  SITE_NAME: "PrepressHub",
  ADMIN_EMAIL: "abdullahyz018@gmail.com"
};
```

Secret key, service-role key, database password বা admin password এখানে দেবেন না।

## ধাপ ৫: Authentication URL সেট করুন

Supabase → **Authentication → URL Configuration**। প্রথমে local test-এর জন্য:

```text
Site URL: http://localhost:8788
Redirect URL: http://localhost:8788/**
```

Email confirmation production-এ চালু রাখুন।

## ধাপ ৬: Local test করুন

`Start_Local_Cloudflare.bat` double-click করুন। Node.js না থাকলে আগে Node.js LTS install করুন।

অথবা project folder-এ Command Prompt খুলে চালান:

```bash
npx wrangler pages dev . --port 8788
```

তারপর খুলুন:

```text
http://localhost:8788
```

`index.html` সরাসরি double-click করে `file:///` দিয়ে চালাবেন না। ES module ও Auth redirect ঠিকমতো কাজ নাও করতে পারে।

## ধাপ ৭: Admin account তৈরি করুন

Admin password repository-তে থাকবে না।

1. Local site-এ Professional Signup খুলুন।
2. Email দিন `abdullahyz018@gmail.com`।
3. নিজের শক্ত password দিন।
4. প্রয়োজনীয় profile তথ্য ও একটি PDF CV দিন।
5. Email confirmation সম্পন্ন করুন।
6. Supabase SQL Editor-এ `supabase/002_promote_admin.sql` run করুন।
7. Log out করে আবার login করুন।
8. Admin menu খুলুন।
9. `supabase/004_verify_setup.sql` আবার চালিয়ে admin row-তে `role=admin`, `status=approved` নিশ্চিত করুন।

## ধাপ ৮: GitHub repository তৈরি করুন

GitHub-এ নতুন empty repository তৈরি করুন:

```text
prepresshub
```

README, .gitignore বা licence দিয়ে initialise না করাই সহজ।

Extracted project folder-এ Git Bash খুলে চালান:

```bash
git init -b main
git add .
git commit -m "Initial PrepressHub Supabase deployment"
git remote add origin https://github.com/YOUR_USERNAME/prepresshub.git
git push -u origin main
```

GitHub repository-তে গিয়ে নিশ্চিত করুন `index.html`, `assets`, `supabase`, `_redirects`, `_headers` দেখা যাচ্ছে।

## ধাপ ৯: Cloudflare Pages deploy করুন

1. Cloudflare Dashboard → **Workers & Pages**।
2. **Create application → Pages → Connect to Git**।
3. GitHub authorise করুন।
4. `prepresshub` repository নির্বাচন করুন।
5. Build settings:

```text
Production branch: main
Framework preset: None
Build command: exit 0
Build output directory: .
Root directory: blank
```

6. **Save and Deploy** চাপুন।
7. Deploy শেষ হলে একটি URL পাবেন, যেমন:

```text
https://prepresshub.pages.dev
```

## ধাপ ১০: Supabase production redirect URL আপডেট করুন

Supabase → Authentication → URL Configuration:

```text
Site URL: https://YOUR-PROJECT.pages.dev
Redirect URL: https://YOUR-PROJECT.pages.dev/**
```

Local test চালু রাখতে `http://localhost:8788/**`-ও Redirect URLs-এ রাখুন।

## ধাপ ১১: Production test sequence

এই ক্রমে পরীক্ষা করুন:

1. Professional signup ও email confirmation
2. Admin dashboard-এ pending user এবং CV preview
3. User approve
4. Approved user login ও profile update
5. Portfolio ফাঁকা রেখেও required fields পূরণে 100%
6. একই company name দিয়ে দুই professional signup; একটিই company profile থাকা
7. Company signup দিয়ে existing company claim তৈরি হওয়া
8. Claim evidence preview এবং approval
9. Company email domain match করলে verified badge
10. Named team-leader review ও night-shift rating cap
11. Review approval
12. Real job post ও approval
13. Advertisement upload ও approval
14. Approved user/company দিয়ে CV preview
15. Duplicate company merge
16. Fake job poster ban/unban

## ধাপ ১২: Custom domain

Cloudflare Pages project → **Custom domains** → domain যোগ করুন। Domain active হওয়ার পরে Supabase Site URL ও Redirect URLs-এ custom domain যোগ করুন।

## ভবিষ্যৎ update deploy

Code edit করার পরে:

```bash
git add .
git commit -m "Describe the update"
git push
```

Cloudflare Git integration নতুন commit স্বয়ংক্রিয়ভাবে deploy করবে।

## গুরুত্বপূর্ণ সীমাবদ্ধতা

- Download button না থাকলেও authorised viewer screenshot, print বা browser network response capture করতে পারে। Web browser-এ CV copy শতভাগ বন্ধ করা যায় না।
- Production launch-এর আগে CAPTCHA, custom SMTP, malware scanning, file-signature validation, backup policy, privacy policy, defamation/review policy এবং legal review যোগ করুন।
- `config.js`-এর Publishable Key public হওয়া স্বাভাবিক; নিরাপত্তা RLS-এর মাধ্যমে enforce হয়। Secret/service-role key কখনো frontend বা GitHub-এ দেবেন না।

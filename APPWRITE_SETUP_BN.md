# PrepressHub Appwrite সম্পূর্ণ সেটআপ গাইড

## ১. Appwrite project

1. Appwrite Cloud Console-এ নতুন project তৈরি করুন।
2. Project-এর **Settings** থেকে Project ID এবং API Endpoint কপি করুন। Endpoint সাধারণত `https://<REGION>.cloud.appwrite.io/v1`।
3. **Platforms → Add platform → Web** থেকে প্রথমে `localhost`, পরে live domain যোগ করুন।

## ২. Setup API key

Project **Settings → API keys** থেকে সাময়িক key তৈরি করুন। Setup-এর জন্য database/collection/attribute/index, storage bucket এবং function create/write scopes দিন।

`.env.example` কপি করে `.env` করুন:

```env
APPWRITE_ENDPOINT=https://YOUR_REGION.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=YOUR_PROJECT_ID
APPWRITE_API_KEY=YOUR_TEMPORARY_SETUP_KEY
ADMIN_EMAIL=abdullahyz018@gmail.com
```

তারপর project folder-এ চালান:

```powershell
node scripts/setup-appwrite.mjs
```

এটি `prepresshub` database, private `records` collection, প্রয়োজনীয় index, `prepresshub-files` bucket এবং `prepresshub-api` Function configuration তৈরি করবে। কোনো resource আগে থেকে থাকলে script সেটি রেখে পরের ধাপে যাবে। Setup সফল হলে API key delete/revoke করুন এবং `.env` মুছে ফেলুন বা private রাখুন।

## ৩. Function deploy

Appwrite Console → **Functions → prepresshub-api** খুলুন। যদি setup script Function তৈরি করতে না পারে, একই ID দিয়ে manually তৈরি করুন।

- Runtime: Node.js 22
- Root/source folder: `functions/prepresshub-api`
- Build command: `npm install`
- Entrypoint: `src/main.js`
- Execute access: Any
- Timeout: 30 seconds

Function scopes:

- documents.read, documents.write
- files.read, files.write
- users.read, users.write
- tokens.write

Environment variables:

```text
DATABASE_ID=prepresshub
RECORDS_COLLECTION_ID=records
BUCKET_ID=prepresshub-files
ADMIN_EMAIL=abdullahyz018@gmail.com
```

Source GitHub-এ push করে Appwrite-এর Git deployment ব্যবহার করা সবচেয়ে সহজ। Repository root আলাদা হলে Function root `functions/prepresshub-api` দিন। Deployment complete এবং active না হওয়া পর্যন্ত frontend data load করবে না।

## ৪. Frontend config

`config.js` এ browser-safe values দিন:

```js
window.PREPRESSHUB_CONFIG = {
  APPWRITE_ENDPOINT: "https://YOUR_REGION.cloud.appwrite.io/v1",
  APPWRITE_PROJECT_ID: "YOUR_PROJECT_ID",
  APPWRITE_FUNCTION_ID: "prepresshub-api",
  APPWRITE_DATABASE_ID: "prepresshub",
  APPWRITE_BUCKET_ID: "prepresshub-files",
  SITE_NAME: "PrepressHub",
  ADMIN_EMAIL: "abdullahyz018@gmail.com"
};
```

এখানে secret/API key বসাবেন না।

## ৫. Local test

`Start_Local_Appwrite.bat` double-click করুন অথবা:

```powershell
python -m http.server 5500
```

তারপর `http://localhost:5500` খুলুন। Appwrite Web platform-এ `localhost` থাকতে হবে। শুধু `index.html` double-click করলে setup-required page দেখা যাবে, কিন্তু login/storage-এর নির্ভরযোগ্য পরীক্ষা local server-এ করুন।

## ৬. প্রথম admin

`ADMIN_EMAIL`-এর একই email দিয়ে প্রথম signup করুন। Backend Appwrite-এর authenticated email যাচাই করে ওই account-কে admin role ও approved status দেবে। Email/password frontend বা repository-তে রাখা হয় না।

## ৭. Live deploy

দুটি উপায়:

1. **Appwrite Sites:** Vanilla site হিসেবে repository connect করুন, build command খালি এবং output directory `./` দিন।
2. **Cloudflare Pages:** একই static folder deploy করুন; build command খালি এবং output directory `/` দিন। Backend Appwrite-এই থাকবে।

Live URL পাওয়ার পর Appwrite **Platforms → Web**-এ hostname যোগ করুন।

## ৮. Production checklist

- Function deployment active
- Function execute access `Any`, কিন্তু admin কাজ server-side admin check দ্বারা protected
- `records` collection-এ public client permission নেই
- bucket file security enabled
- setup API key revoked
- `.env` GitHub-এ নেই
- admin, professional, company—তিন ধরনের account test করা হয়েছে
- pending content public page-এ দেখা যায় না
- approved ad banner public এবং CV/proof private থাকে

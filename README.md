# PrepressHub Appwrite Edition v2.0

PrepressHub-এর সম্পূর্ণ static frontend এখন Appwrite Auth, Database, Storage এবং Function backend ব্যবহার করে। Supabase-এর কোনো runtime dependency নেই।

## অন্তর্ভুক্ত ফিচার

- Professional ও company signup/login
- Email verification request
- Admin approval, reject, ban এবং delete
- Public company/professional directory
- Career history ও duplicate-company suggestion
- Company review, team-lead rating ও night-shift rating cap
- Verified-company job posting
- Advertisement submission ও moderation
- Private CV এবং company-proof storage
- স্বল্পমেয়াদি file-token দিয়ে অনুমোদিত CV/proof preview
- বাংলা/English UI, responsive layout এবং accessibility support
- Appwrite database/storage setup script
- Appwrite Function-ভিত্তিক central authorization; frontend-এ কোনো API secret নেই

## দ্রুত শুরু

1. `.env.example` কপি করে `.env` করুন এবং Appwrite setup API key দিন।
2. চালান: `node scripts/setup-appwrite.mjs`
3. `functions/prepresshub-api` Appwrite Function হিসেবে deploy করুন।
4. `config.example.js` কপি করে `config.js`-এ নিজের Endpoint/Project ID দিন।
5. local test-এর জন্য `Start_Local_Appwrite.bat` চালান।

সম্পূর্ণ নির্দেশনা: [APPWRITE_SETUP_BN.md](APPWRITE_SETUP_BN.md)

## গুরুত্বপূর্ণ

- `.env` বা setup API key কখনো GitHub-এ commit করবেন না। Setup শেষ হলে key delete/revoke করুন।
- Appwrite project-এর Web platform-এ production domain এবং local testing-এর জন্য `localhost` যোগ করুন।
- `index.html` double-click করলে configuration screen দেখা যাবে; authentication/storage test করতে local HTTP server ব্যবহার করুন, কারণ browser cookie/CORS policy `file://` origin-এ নির্ভরযোগ্য নয়।
- Database-এর `records` collection সরাসরি client-readable নয়। সব data access `prepresshub-api` Function যাচাই করে।

## Project structure

```text
assets/app.js                 Existing UI and feature logic
assets/appwrite.js            Appwrite browser adapter
functions/prepresshub-api/    Secure backend Function
scripts/setup-appwrite.mjs    Database, bucket and Function bootstrap
config.js                     Browser-safe Appwrite IDs only
```

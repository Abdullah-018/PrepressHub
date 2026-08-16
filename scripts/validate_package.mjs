import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const required = [
  'index.html', 'config.js', 'config.example.js', 'assets/app.js', 'assets/appwrite.js', 'assets/styles.css',
  '_headers', '_redirects', 'README.md', 'APPWRITE_SETUP_BN.md', '.env.example',
  'scripts/setup-appwrite.mjs', 'functions/prepresshub-api/package.json', 'functions/prepresshub-api/src/main.js'
];
const failures = [];
for (const file of required) {
  try { await access(resolve(root, file)); } catch { failures.push(`Missing: ${file}`); }
}

const [index, config, app, adapter, fn, headers] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'), readFile(resolve(root, 'config.js'), 'utf8'),
  readFile(resolve(root, 'assets/app.js'), 'utf8'), readFile(resolve(root, 'assets/appwrite.js'), 'utf8'),
  readFile(resolve(root, 'functions/prepresshub-api/src/main.js'), 'utf8'), readFile(resolve(root, '_headers'), 'utf8')
]);

if (!index.includes('appwrite@17.0.0')) failures.push('Appwrite browser SDK is not loaded.');
if (!index.includes('./assets/app.js')) failures.push('Frontend module is not loaded.');
if (/GitHub \+ Cloudflare Pages \+ Supabase/i.test(index)) failures.push('Old footer credit remains.');
if (!config.includes('APPWRITE_PROJECT_ID') || !config.includes('APPWRITE_ENDPOINT')) failures.push('config.js is missing Appwrite settings.');
if (/APPWRITE_API_KEY|x-appwrite-key/i.test(config)) failures.push('A secret key marker exists in browser config.js.');
if (!adapter.includes('new sdk.Account') || !adapter.includes('new sdk.Functions')) failures.push('Appwrite adapter is incomplete.');
if (!fn.includes("x-appwrite-user-id") || !fn.includes('fileToken')) failures.push('Backend authorization/token flow is incomplete.');
if (!headers.includes('cloud.appwrite.io')) failures.push('CSP does not allow Appwrite Cloud.');
if (!app.includes('boot().catch')) failures.push('Frontend boot error handling is missing.');

if (failures.length) {
  console.error('VALIDATION FAILED');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('VALIDATION PASSED');
console.log(`Checked ${required.length} required files and Appwrite security wiring.`);

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || 'prepresshub';
const collectionId = process.env.APPWRITE_RECORDS_COLLECTION_ID || 'records';
const bucketId = process.env.APPWRITE_BUCKET_ID || 'prepresshub-files';
const functionId = process.env.APPWRITE_FUNCTION_ID || 'prepresshub-api';
const adminEmail = process.env.ADMIN_EMAIL || 'abdullahyz018@gmail.com';

if (!endpoint || !projectId || !apiKey) {
  console.error('Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID or APPWRITE_API_KEY in .env');
  process.exit(1);
}

const headers = { 'content-type': 'application/json', 'x-appwrite-project': projectId, 'x-appwrite-key': apiKey, 'x-appwrite-response-format': '1.8.0' };

async function request(method, pathname, body, allowConflict = true) {
  const response = await fetch(`${endpoint}${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok && !(allowConflict && response.status === 409)) throw new Error(`${method} ${pathname}: ${data?.message || response.statusText}`);
  console.log(`${response.status === 409 ? 'EXISTS' : 'OK'} ${pathname}`);
  return data;
}

async function waitForAttributes() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await fetch(`${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes`, { headers });
    const data = await response.json();
    if (response.ok && data.attributes?.length >= 7 && data.attributes.every((item) => item.status === 'available')) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error('Attributes did not become available in time. Run the setup script again.');
}

await request('POST', '/databases', { databaseId, name: 'PrepressHub', enabled: true });
await request('POST', `/databases/${databaseId}/collections`, { collectionId, name: 'PrepressHub records', permissions: [], documentSecurity: false, enabled: true });

const attributes = [
  ['table', 40, true, null], ['logical_id', 36, true, null], ['owner_id', 36, false, ''],
  ['status', 32, false, ''], ['ref1', 36, false, ''], ['ref2', 36, false, ''], ['data', 16383, true, null]
];
for (const [key, size, required, xdefault] of attributes) {
  await request('POST', `/databases/${databaseId}/collections/${collectionId}/attributes/string`, clean({ key, size, required, default: required ? undefined : xdefault, array: false, encrypt: false }));
}
await waitForAttributes();
await request('POST', `/databases/${databaseId}/collections/${collectionId}/indexes`, { key: 'table_idx', type: 'key', attributes: ['table'], orders: ['ASC'] });

await request('POST', '/storage/buckets', {
  bucketId, name: 'PrepressHub private files', permissions: ['create("users")'], fileSecurity: true, enabled: true,
  maximumFileSize: 10485760, allowedFileExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
  compression: 'none', encryption: true, antivirus: true, transformations: true
});

try {
  await request('POST', '/functions', {
    functionId, name: 'PrepressHub API', runtime: 'node-22', execute: ['any'], events: [], schedule: '', timeout: 30,
    enabled: true, logging: true, entrypoint: 'src/main.js', commands: 'npm install',
    scopes: ['documents.read', 'documents.write', 'files.read', 'files.write', 'users.read', 'users.write', 'tokens.write']
  });
  for (const [key, value] of Object.entries({ DATABASE_ID: databaseId, RECORDS_COLLECTION_ID: collectionId, BUCKET_ID: bucketId, ADMIN_EMAIL: adminEmail })) {
    await request('POST', `/functions/${functionId}/variables`, { variableId: key.toLowerCase(), key, value, secret: false });
  }
} catch (setupError) {
  console.warn(`Function auto-configuration skipped: ${setupError.message}`);
  console.warn('Use APPWRITE_SETUP_BN.md to create/configure the function from Appwrite Console.');
}

console.log('\nAppwrite database and storage setup completed.');
console.log('Next: deploy functions/prepresshub-api, add a Web platform, then fill config.js.');

function clean(object) { return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)); }

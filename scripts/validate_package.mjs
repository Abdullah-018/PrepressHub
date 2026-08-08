import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html','config.js','assets/app.js','assets/supabase.js','assets/styles.css',
  '_headers','_redirects','supabase/001_schema_and_security.sql',
  'supabase/004_verify_setup.sql','supabase/005_security_and_integrity_upgrade.sql'
];

for (const file of required) await access(resolve(root,file));

const [html,app,config,schema,upgrade,headers] = await Promise.all([
  readFile(resolve(root,'index.html'),'utf8'),
  readFile(resolve(root,'assets/app.js'),'utf8'),
  readFile(resolve(root,'config.js'),'utf8'),
  readFile(resolve(root,'supabase/001_schema_and_security.sql'),'utf8'),
  readFile(resolve(root,'supabase/005_security_and_integrity_upgrade.sql'),'utf8'),
  readFile(resolve(root,'_headers'),'utf8')
]);

const failures = [];
const requireText = (text,needle,label) => { if(!text.includes(needle)) failures.push(label); };

requireText(html,'href="#privacy"','Privacy route link is missing');
requireText(html,'href="#review-guidelines"','Review-guidelines route link is missing');
requireText(html,'aria-live="polite"','Accessible status announcements are missing');
requireText(app,"rpc('replace_employment_history'",'Atomic employment-history RPC is not used');
requireText(app,"rpc('admin_set_company_domain'",'Admin domain-verification RPC is not used');
requireText(schema,'jobs.company_id','Trusted-company job policy is missing');
requireText(schema,'revoke update(email_domain)','Company domain update privilege is not revoked');
requireText(upgrade,'update public.profiles set company_email_verified=false','Upgrade does not revoke legacy self-verification');
requireText(headers,"Content-Security-Policy:",'Content Security Policy is missing');

if (/service_role|SUPABASE_SECRET_KEY|sb_secret_/i.test(config)) failures.push('A secret/service-role key marker exists in config.js');

const localRefs = [...html.matchAll(/(?:src|href)=["']\.\/([^"'#?]+)["']/g)].map(match=>match[1]);
for (const ref of localRefs) {
  try { await access(resolve(root,ref)); } catch { failures.push(`Missing local asset: ${ref}`); }
}

if (failures.length) {
  console.error(failures.map(item=>`- ${item}`).join('\n'));
  process.exitCode=1;
} else {
  console.log(`Package validation passed (${required.length} required files, ${localRefs.length} local references).`);
}

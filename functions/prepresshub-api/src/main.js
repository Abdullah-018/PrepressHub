import {
  Client, Databases, Storage, Users, ID, Query, Permission, Role
} from 'node-appwrite';

const DB_ID = process.env.DATABASE_ID || 'prepresshub';
const RECORDS = process.env.RECORDS_COLLECTION_ID || 'records';
const BUCKET_ID = process.env.BUCKET_ID || 'prepresshub-files';
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

function clean(object) {
  return Object.fromEntries(Object.entries(object || {}).filter(([, value]) => value !== undefined));
}

function safeJson(value, fallback = {}) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalize(document) {
  if (!document) return null;
  const data = safeJson(document.data, {});
  return {
    ...data,
    id: document.logical_id,
    created_at: data.created_at || document.$createdAt,
    updated_at: data.updated_at || document.$updatedAt,
    __documentId: document.$id
  };
}

function storageId(path) {
  const value = String(path || 'file');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const tail = value.split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_').slice(-22);
  return `f_${(hash >>> 0).toString(36)}_${tail}`.slice(0, 36);
}

export default async ({ req, res, error, log }) => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const dynamicKey = req.headers['x-appwrite-key'];
  const userId = req.headers['x-appwrite-user-id'] || '';
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(dynamicKey);
  const databases = new Databases(client);
  const storage = new Storage(client);
  const users = new Users(client);

  const list = async (table) => {
    const result = await databases.listDocuments({
      databaseId: DB_ID,
      collectionId: RECORDS,
      queries: [Query.equal('table', [table]), Query.limit(5000)]
    });
    return result.documents.map(normalize);
  };

  const one = async (table, id) => (await list(table)).find((row) => row.id === id) || null;

  const create = async (table, input, id = input?.id || ID.unique(), ownerId = input?.owner_id || userId) => {
    const now = new Date().toISOString();
    const data = clean({ ...input, id, created_at: input?.created_at || now, updated_at: now });
    const doc = await databases.createDocument({
      databaseId: DB_ID,
      collectionId: RECORDS,
      documentId: ID.unique(),
      data: {
        table,
        logical_id: id,
        owner_id: ownerId || '',
        status: String(data.status || ''),
        ref1: String(data.company_id || data.user_id || data.profile_id || ''),
        ref2: String(data.claimant_id || data.reviewer_id || data.poster_id || ''),
        data: JSON.stringify(data)
      }
    });
    return normalize(doc);
  };

  const update = async (table, id, patch) => {
    const current = await one(table, id);
    if (!current) throw new Error(`${table} record not found.`);
    const data = clean({ ...current, ...patch, id, updated_at: new Date().toISOString() });
    delete data.__documentId;
    const doc = await databases.updateDocument({
      databaseId: DB_ID,
      collectionId: RECORDS,
      documentId: current.__documentId,
      data: {
        owner_id: String(data.owner_id || current.owner_id || ''),
        status: String(data.status || ''),
        ref1: String(data.company_id || data.user_id || data.profile_id || ''),
        ref2: String(data.claimant_id || data.reviewer_id || data.poster_id || ''),
        data: JSON.stringify(data)
      }
    });
    return normalize(doc);
  };

  const remove = async (table, id) => {
    const current = await one(table, id);
    if (!current) return;
    await databases.deleteDocument({ databaseId: DB_ID, collectionId: RECORDS, documentId: current.__documentId });
  };

  const currentUser = async () => userId ? users.get({ userId }) : null;
  const profileFor = async (id = userId) => one('profiles', id);
  const isAdmin = async () => {
    if (!userId) return false;
    const profile = await profileFor();
    if (profile?.role === 'admin') return true;
    if (!ADMIN_EMAIL) return false;
    const user = await currentUser();
    return String(user?.email || '').toLowerCase() === ADMIN_EMAIL;
  };
  const requireUser = () => { if (!userId) throw new Error('Login required.'); };
  const requireAdmin = async () => { if (!(await isAdmin())) throw new Error('Administrator access required.'); };
  const requireApproved = async () => {
    requireUser();
    const profile = await profileFor();
    if (!profile || profile.status !== 'approved') throw new Error('Approved account required.');
    return profile;
  };

  const companyByName = async (name) => {
    const normalized = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return (await list('companies')).find((company) => String(company.normalized_name || company.name || '').toLowerCase() === normalized) || null;
  };

  const withRelations = async (table, rows, fields = '*') => {
    if (table === 'employment_history' && fields.includes('companies(')) {
      const companies = await list('companies');
      rows.forEach((row) => { row.companies = companies.find((item) => item.id === row.company_id) || null; });
    }
    if (table === 'employment_history' && fields.includes('profiles(')) {
      const profiles = await list('profiles');
      rows.forEach((row) => { row.profiles = profiles.find((item) => item.id === row.user_id) || null; });
    }
    if (table === 'profiles' && fields.includes('profile_private(')) {
      const privateRows = await list('profile_private');
      rows.forEach((row) => { row.profile_private = privateRows.filter((item) => item.id === row.id); });
    }
    if (table === 'companies' && fields.includes('company_private(')) {
      const privateRows = await list('company_private');
      rows.forEach((row) => { row.company_private = privateRows.filter((item) => item.company_id === row.id); });
    }
    if (['reviews', 'company_claims'].includes(table) && fields.includes('profiles(')) {
      const profiles = await list('profiles');
      rows.forEach((row) => { row.profiles = profiles.find((item) => item.id === (row.reviewer_id || row.claimant_id)) || null; });
    }
    if (['reviews', 'company_claims'].includes(table) && fields.includes('companies(')) {
      const companies = await list('companies');
      rows.forEach((row) => { row.companies = companies.find((item) => item.id === row.company_id) || null; });
    }
    return rows;
  };

  const reviewFeed = async () => {
    const [reviews, companies, profiles] = await Promise.all([list('reviews'), list('companies'), list('profiles')]);
    return reviews.filter((row) => row.status === 'approved').map((row) => {
      const ratings = ['salary_benefits', 'work_environment', 'management', 'career_growth', 'work_life_balance'].map((key) => Number(row[key] || 0));
      let overall = ratings.reduce((sum, value) => sum + value, 0) / Math.max(1, ratings.length);
      if (row.night_shift) overall = Math.min(overall, 2.5);
      return {
        ...row,
        reviewer_id: row.is_anonymous ? null : row.reviewer_id,
        reviewer_name: row.is_anonymous ? 'Anonymous' : (profiles.find((p) => p.id === row.reviewer_id)?.full_name || 'Professional'),
        company_name: companies.find((c) => c.id === row.company_id)?.name || row.company_name,
        overall_rating: Number(overall.toFixed(2))
      };
    });
  };

  const canReadTable = async (table, rows) => {
    const admin = await isAdmin();
    if (admin) return rows;
    if (table === 'profiles') return rows.filter((r) => r.status === 'approved' || r.id === userId);
    if (table === 'profile_private') return rows.filter((r) => r.id === userId);
    if (table === 'companies') return rows.filter((r) => r.status === 'approved' || r.claimed_by === userId || r.created_by === userId);
    if (table === 'company_private') {
      const companies = await list('companies');
      return rows.filter((r) => companies.find((c) => c.id === r.company_id)?.claimed_by === userId);
    }
    if (table === 'employment_history') {
      const profiles = await list('profiles');
      const visible = new Set(profiles.filter((p) => p.status === 'approved' || p.id === userId).map((p) => p.id));
      return rows.filter((r) => visible.has(r.user_id));
    }
    if (['jobs', 'advertisements', 'reviews'].includes(table)) return rows.filter((r) => r.status === 'approved' || r.poster_id === userId || r.reviewer_id === userId);
    if (table === 'company_claims') return rows.filter((r) => r.claimant_id === userId);
    return [];
  };

  const applyFilters = (rows, filters = []) => rows.filter((row) => filters.every((filter) => {
    if (filter.type === 'eq') return row[filter.key] === filter.value;
    if (filter.type === 'in') return (filter.values || []).includes(row[filter.key]);
    return true;
  }));

  const dataAction = async (body) => {
    const { operation, table, payload, filters = [], orders = [], fields = '*', mode = 'many', options = {} } = body;
    const admin = await isAdmin();
    if (operation === 'select') {
      let rows = table === 'review_feed' ? await reviewFeed() : await list(table);
      rows = table === 'review_feed' ? rows : await canReadTable(table, rows);
      rows = applyFilters(rows, filters);
      for (const order of [...orders].reverse()) {
        rows.sort((a, b) => (a[order.column] > b[order.column] ? 1 : a[order.column] < b[order.column] ? -1 : 0) * (order.ascending ? 1 : -1));
      }
      if (body.limit) rows = rows.slice(0, body.limit);
      rows = await withRelations(table, rows, fields);
      const projected = rows.map((row) => { const copy = { ...row }; delete copy.__documentId; return copy; });
      const result = mode === 'single' ? projected[0] : mode === 'maybeSingle' ? (projected[0] || null) : projected;
      return { data: options.head ? null : result, count: options.count ? projected.length : null };
    }
    requireUser();
    if (operation === 'insert') {
      let input = Array.isArray(payload) ? payload[0] : payload;
      if (['jobs', 'reviews', 'advertisements'].includes(table)) await requireApproved();
      if (table === 'jobs') {
        const profile = await profileFor();
        const company = await one('companies', input.company_id);
        if (profile.account_type !== 'company' || !profile.company_email_verified || company?.claimed_by !== userId) throw new Error('Verified company account required.');
      }
      if (!['jobs', 'reviews', 'advertisements', 'company_claims'].includes(table)) throw new Error('Create operation is not allowed for this table.');
      if (table === 'jobs') input = { ...input, poster_id: userId, status: 'pending' };
      if (table === 'reviews') input = { ...input, reviewer_id: userId, status: 'pending' };
      if (table === 'advertisements') input = { ...input, poster_id: userId, status: 'pending' };
      if (table === 'company_claims') input = { ...input, claimant_id: userId, status: 'pending' };
      return { data: await create(table, { ...input, owner_id: userId }, input.id, userId) };
    }
    let rows = applyFilters(await list(table), filters);
    if (!rows.length && operation === 'upsert') {
      if (!['profile_private', 'company_private'].includes(table)) throw new Error('Upsert is not allowed.');
      const input = Array.isArray(payload) ? payload[0] : payload;
      if (table === 'profile_private' && input.id !== userId) throw new Error('Not allowed.');
      if (table === 'company_private') {
        const company = await one('companies', input.company_id);
        if (!company || company.claimed_by !== userId) throw new Error('Not allowed.');
      }
      return { data: await create(table, { ...input, owner_id: userId }, input.id || input.company_id, userId) };
    }
    for (const row of rows) {
      const owned = row.id === userId || row.owner_id === userId || row.poster_id === userId || row.reviewer_id === userId || row.claimant_id === userId;
      const companyOwned = table === 'companies' && row.claimed_by === userId;
      if (!admin && !owned && !companyOwned) throw new Error('Not allowed.');
      if (operation === 'delete') await remove(table, row.id);
      else if (operation === 'update' || operation === 'upsert') {
        let safePatch = payload;
        if (!admin) {
          const allowed = {
            profiles: ['full_name', 'location', 'skills', 'bio', 'portfolio_url', 'has_cv', 'profile_completion'],
            profile_private: ['phone', 'cv_path'],
            companies: ['location', 'worker_capacity_min', 'worker_capacity_max', 'salary_day_from', 'salary_day_to', 'website', 'compliance', 'provident_fund', 'overtime_paid', 'weekly_holiday', 'festival_bonus', 'night_shift', 'transport', 'canteen'],
            company_private: ['proof_path'],
            company_claims: ['evidence_path']
          }[table] || [];
          safePatch = Object.fromEntries(Object.entries(payload || {}).filter(([key]) => allowed.includes(key)));
          if (!Object.keys(safePatch).length) throw new Error('No allowed fields were provided.');
        }
        await update(table, row.id, safePatch);
      }
    }
    return { data: rows };
  };

  const bootstrap = async (metadata) => {
    requireUser();
    if (await one('profiles', userId)) return one('profiles', userId);
    const user = await currentUser();
    const role = ADMIN_EMAIL && String(user.email).toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
    const accountType = metadata.account_type === 'company' ? 'company' : 'professional';
    let companyId = null;
    if (accountType === 'company') {
      const existing = await companyByName(metadata.company_name);
      if (existing) {
        companyId = existing.id;
        await create('company_claims', { company_id: companyId, claimant_id: userId, status: 'pending', evidence_path: null, owner_id: userId });
      } else {
        const company = await create('companies', {
          name: metadata.company_name,
          normalized_name: String(metadata.company_name || '').trim().toLowerCase().replace(/\s+/g, ' '),
          location: metadata.company_location || metadata.location,
          worker_capacity_min: metadata.worker_capacity_min || 0,
          worker_capacity_max: metadata.worker_capacity_max || 0,
          compliance: Boolean(metadata.compliance), provident_fund: Boolean(metadata.provident_fund),
          salary_day_from: metadata.salary_day_from || null, salary_day_to: metadata.salary_day_to || null,
          overtime_paid: Boolean(metadata.overtime_paid), weekly_holiday: Boolean(metadata.weekly_holiday),
          festival_bonus: Boolean(metadata.festival_bonus), night_shift: Boolean(metadata.night_shift),
          transport: Boolean(metadata.transport), canteen: Boolean(metadata.canteen), website: metadata.website || '',
          email_domain: null, claimed_by: userId, created_by: userId, status: role === 'admin' ? 'approved' : 'pending', owner_id: userId
        });
        companyId = company.id;
        await create('company_private', { company_id: companyId, proof_path: null, owner_id: userId }, companyId, userId);
      }
    }
    const profile = await create('profiles', {
      account_type: accountType, role, status: role === 'admin' ? 'approved' : 'pending',
      full_name: metadata.full_name || user.name || user.email,
      location: metadata.location || '', skills: [], bio: '', portfolio_url: '',
      company_id: companyId, company_email_verified: false, has_cv: false, profile_completion: 40,
      owner_id: userId
    }, userId, userId);
    await create('profile_private', { id: userId, phone: metadata.phone || '', cv_path: null, owner_id: userId }, userId, userId);
    if (accountType === 'professional' && metadata.current_company) {
      let company = await companyByName(metadata.current_company);
      if (!company) company = await create('companies', { name: metadata.current_company, normalized_name: String(metadata.current_company).toLowerCase(), location: metadata.location || '', status: 'pending', claimed_by: null, created_by: userId, owner_id: userId });
      await create('employment_history', { user_id: userId, company_id: company.id, company_name_snapshot: company.name, designation: metadata.current_designation || '', location: metadata.location || '', is_current: true, owner_id: userId }, undefined, userId);
    }
    return profile;
  };

  const rpcAction = async (name, args) => {
    if (name === 'find_company_matches') {
      const q = String(args.p_name || '').toLowerCase();
      return (await list('companies')).filter((c) => c.name?.toLowerCase().includes(q)).slice(0, 8).map(({ id, name, location, status }) => ({ id, name, location, status }));
    }
    if (name === 'get_cv_path') {
      await requireApproved();
      const target = await one('profiles', args.p_user_id);
      if (!target || target.status !== 'approved') throw new Error('CV is not available.');
      return (await one('profile_private', args.p_user_id))?.cv_path || null;
    }
    if (name === 'replace_employment_history') {
      await requireApproved();
      for (const row of (await list('employment_history')).filter((r) => r.user_id === userId)) await remove('employment_history', row.id);
      const addEmployment = async (item, isCurrent = false) => {
        let company = await companyByName(item.company_name);
        if (!company) company = await create('companies', { name: item.company_name, normalized_name: item.company_name.toLowerCase(), location: args.p_location || '', status: 'pending', claimed_by: null, created_by: userId, owner_id: userId });
        return create('employment_history', { user_id: userId, company_id: company.id, company_name_snapshot: company.name, designation: item.designation, location: args.p_location || '', start_date: item.start_date || null, end_date: item.end_date || null, is_current: isCurrent, owner_id: userId }, undefined, userId);
      };
      await addEmployment({ company_name: args.p_current_company_name, designation: args.p_current_designation }, true);
      for (const item of args.p_previous || []) await addEmployment(item, false);
      return true;
    }
    if (name === 'sync_company_email_badge') {
      requireUser();
      const profile = await profileFor(args.p_user_id || userId);
      if (!profile || profile.id !== userId) throw new Error('Not allowed.');
      const company = profile.company_id ? await one('companies', profile.company_id) : null;
      const user = await currentUser();
      const domain = String(user.email || '').split('@')[1]?.toLowerCase();
      const verified = Boolean(company?.email_domain && domain === String(company.email_domain).toLowerCase());
      await update('profiles', profile.id, { company_email_verified: verified });
      return verified;
    }
    await requireAdmin();
    if (name === 'admin_set_profile_status') return update('profiles', args.p_id, { status: args.p_status });
    if (name === 'admin_set_company_status') return update('companies', args.p_id, { status: args.p_status });
    if (name === 'admin_set_claim_status') return update('company_claims', args.p_id, { status: args.p_status });
    if (name === 'admin_set_company_domain') return update('companies', args.p_id, { email_domain: args.p_domain || null });
    if (name === 'admin_moderate_content') {
      const table = args.p_kind === 'advertisements' ? 'advertisements' : args.p_kind;
      const row = await update(table, args.p_id, { status: args.p_status });
      if (table === 'advertisements' && row.banner_path) {
        const owner = row.poster_id;
        const permissions = args.p_status === 'approved'
          ? [Permission.read(Role.any()), Permission.update(Role.user(owner)), Permission.delete(Role.user(owner))]
          : [Permission.read(Role.user(owner)), Permission.update(Role.user(owner)), Permission.delete(Role.user(owner))];
        await storage.updateFile({ bucketId: BUCKET_ID, fileId: storageId(row.banner_path), permissions });
      }
      return row;
    }
    if (name === 'admin_delete_profile') {
      for (const table of ['profile_private', 'employment_history', 'reviews', 'jobs', 'advertisements', 'company_claims']) {
        for (const row of (await list(table)).filter((r) => r.id === args.p_id || r.user_id === args.p_id || r.reviewer_id === args.p_id || r.poster_id === args.p_id || r.claimant_id === args.p_id)) await remove(table, row.id);
      }
      await remove('profiles', args.p_id);
      await users.delete({ userId: args.p_id });
      return true;
    }
    if (name === 'admin_delete_company') { await remove('companies', args.p_id); return true; }
    if (name === 'admin_merge_companies') {
      const source = await one('companies', args.p_source), target = await one('companies', args.p_target);
      if (!source || !target) throw new Error('Company not found.');
      for (const table of ['employment_history', 'reviews', 'jobs', 'company_claims']) {
        for (const row of (await list(table)).filter((r) => r.company_id === source.id)) await update(table, row.id, { company_id: target.id, company_name: target.name, company_name_snapshot: target.name });
      }
      await remove('companies', source.id);
      return target;
    }
    throw new Error(`Unsupported RPC: ${name}`);
  };

  try {
    const body = safeJson(req.body || '{}', {});
    let result;
    if (body.action === 'data') result = await dataAction(body);
    else if (body.action === 'bootstrapSignup') result = await bootstrap(body.metadata || {});
    else if (body.action === 'rpc') result = await rpcAction(body.name, body.args || {});
    else if (body.action === 'registerFile') {
      requireUser();
      const existing = (await list('file_registry')).find((row) => row.namespace === body.namespace && row.path === body.path);
      result = existing ? await update('file_registry', existing.id, { file_id: body.fileId }) : await create('file_registry', { namespace: body.namespace, path: body.path, file_id: body.fileId, owner_id: userId }, undefined, userId);
    } else if (body.action === 'fileToken') {
      requireUser();
      const registry = (await list('file_registry')).find((row) => row.namespace === body.namespace && row.path === body.path);
      if (!registry) throw new Error('File not found.');
      const admin = await isAdmin();
      let allowed = admin || registry.owner_id === userId;
      if (!allowed && body.namespace === 'cvs') {
        const requester = await profileFor();
        const ownerPrivate = (await list('profile_private')).find((row) => row.cv_path === body.path);
        const ownerProfile = ownerPrivate ? await profileFor(ownerPrivate.id) : null;
        allowed = requester?.status === 'approved' && ownerProfile?.status === 'approved';
      }
      if (!allowed) throw new Error('File access denied.');
      const expires = Math.min(600, Math.max(30, Number(body.expiresIn || 120)));
      const expire = new Date(Date.now() + expires * 1000).toISOString();
      const response = await fetch(`${endpoint}/tokens/buckets/${encodeURIComponent(BUCKET_ID)}/files/${encodeURIComponent(registry.file_id)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-appwrite-project': project, 'x-appwrite-key': dynamicKey },
        body: JSON.stringify({ expire })
      });
      const token = await response.json();
      if (!response.ok) throw new Error(token.message || 'Could not create file token.');
      result = { url: `${endpoint}/storage/buckets/${encodeURIComponent(BUCKET_ID)}/files/${encodeURIComponent(registry.file_id)}/view?project=${encodeURIComponent(project)}&token=${encodeURIComponent(token.secret)}` };
    } else throw new Error('Unsupported action.');
    return res.json({ data: result });
  } catch (caught) {
    error(caught.stack || String(caught));
    const status = /required|denied|not allowed|administrator/i.test(caught.message) ? 403 : 400;
    return res.json({ error: caught.message || 'Request failed.' }, status);
  }
};

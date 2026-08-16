export const config = window.PREPRESSHUB_CONFIG || {};

export const isConfigured = Boolean(
  window.Appwrite &&
  config.APPWRITE_ENDPOINT &&
  config.APPWRITE_PROJECT_ID &&
  !String(config.APPWRITE_ENDPOINT).includes('YOUR_REGION') &&
  !String(config.APPWRITE_PROJECT_ID).includes('PASTE_')
);

const sdk = window.Appwrite || {};
const client = isConfigured
  ? new sdk.Client().setEndpoint(config.APPWRITE_ENDPOINT).setProject(config.APPWRITE_PROJECT_ID)
  : null;
const account = client ? new sdk.Account(client) : null;
const functions = client ? new sdk.Functions(client) : null;
const storage = client ? new sdk.Storage(client) : null;

function normalizeUser(user) {
  if (!user) return null;
  return { ...user, id: user.$id || user.id };
}

function appwriteError(error) {
  return error instanceof Error ? error : new Error(error?.message || String(error));
}

async function callApi(action, payload = {}) {
  if (!functions) throw new Error('Appwrite is not configured.');
  const execution = await functions.createExecution({
    functionId: config.APPWRITE_FUNCTION_ID || 'prepresshub-api',
    body: JSON.stringify({ action, ...payload }),
    async: false,
    path: '/api',
    method: sdk.ExecutionMethod?.POST || 'POST'
  });
  let body = {};
  try { body = JSON.parse(execution.responseBody || '{}'); }
  catch { throw new Error(execution.responseBody || 'Invalid response from Appwrite Function.'); }
  if ((execution.responseStatusCode && execution.responseStatusCode >= 400) || body.error) {
    throw new Error(body.error || `Backend request failed (${execution.responseStatusCode}).`);
  }
  return body.data;
}

function logicalFileId(path) {
  const value = String(path || 'file');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const tail = value.split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_').slice(-22);
  return `f_${(hash >>> 0).toString(36)}_${tail}`.slice(0, 36);
}

export function publicFileUrl(path) {
  if (!isConfigured || !path) return '';
  const endpoint = String(config.APPWRITE_ENDPOINT).replace(/\/$/, '');
  return `${endpoint}/storage/buckets/${encodeURIComponent(config.APPWRITE_BUCKET_ID || 'prepresshub-files')}/files/${encodeURIComponent(logicalFileId(path))}/view?project=${encodeURIComponent(config.APPWRITE_PROJECT_ID)}`;
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.operation = 'select';
    this.fields = '*';
    this.filters = [];
    this.orders = [];
    this.max = null;
    this.mode = 'many';
    this.options = {};
    this.payload = null;
  }
  select(fields = '*', options = {}) { this.operation = 'select'; this.fields = fields; this.options = options; return this; }
  insert(payload) { this.operation = 'insert'; this.payload = payload; return this; }
  update(payload) { this.operation = 'update'; this.payload = payload; return this; }
  upsert(payload, options = {}) {
    this.operation = 'upsert';
    this.payload = payload;
    this.options = options;
    const keys = String(options.onConflict || 'id').split(',').map((key) => key.trim()).filter(Boolean);
    for (const key of keys) if (payload?.[key] !== undefined) this.eq(key, payload[key]);
    return this;
  }
  delete() { this.operation = 'delete'; return this; }
  eq(key, value) { this.filters.push({ type: 'eq', key, value }); return this; }
  in(key, values) { this.filters.push({ type: 'in', key, values }); return this; }
  order(column, options = {}) { this.orders.push({ column, ascending: options.ascending !== false }); return this; }
  limit(value) { this.max = value; return this; }
  maybeSingle() { this.mode = 'maybeSingle'; return this; }
  single() { this.mode = 'single'; return this; }
  async execute() {
    try {
      const result = await callApi('data', {
        operation: this.operation,
        table: this.table,
        fields: this.fields,
        filters: this.filters,
        orders: this.orders,
        limit: this.max,
        mode: this.mode,
        options: this.options,
        payload: this.payload
      });
      return { data: result?.data ?? result ?? null, count: result?.count ?? null, error: null };
    } catch (error) {
      return { data: null, count: null, error: appwriteError(error) };
    }
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

const auth = {
  async getSession() {
    try {
      const user = normalizeUser(await account.get());
      return { data: { session: { user } }, error: null };
    } catch (error) {
      if (error?.code === 401) return { data: { session: null }, error: null };
      return { data: { session: null }, error: appwriteError(error) };
    }
  },
  async signUp({ email, password, options = {} }) {
    try {
      const name = options.data?.full_name || email.split('@')[0];
      const created = await account.create({ userId: sdk.ID.unique(), email, password, name });
      await account.createEmailPasswordSession({ email, password });
      const user = normalizeUser(created);
      await callApi('bootstrapSignup', { metadata: options.data || {}, email });
      if (location.protocol !== 'file:') {
        account.createVerification({ url: options.emailRedirectTo || `${location.origin}${location.pathname}?next=account` }).catch(() => {});
      }
      return { data: { user, session: { user } }, error: null };
    } catch (error) { return { data: { user: null, session: null }, error: appwriteError(error) }; }
  },
  async signInWithPassword({ email, password }) {
    try {
      await account.createEmailPasswordSession({ email, password });
      const user = normalizeUser(await account.get());
      return { data: { user, session: { user } }, error: null };
    } catch (error) { return { data: null, error: appwriteError(error) }; }
  },
  async signOut() {
    try { await account.deleteSession({ sessionId: 'current' }); return { error: null }; }
    catch (error) { return { error: appwriteError(error) }; }
  },
  onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }
};

const storageFacade = {
  from(namespace) {
    return {
      async upload(path, file) {
        try {
          const user = normalizeUser(await account.get());
          const permissions = [
            sdk.Permission.read(sdk.Role.user(user.id)),
            sdk.Permission.update(sdk.Role.user(user.id)),
            sdk.Permission.delete(sdk.Role.user(user.id))
          ];
          const result = await storage.createFile({
            bucketId: config.APPWRITE_BUCKET_ID || 'prepresshub-files',
            fileId: logicalFileId(path),
            file,
            permissions
          });
          await callApi('registerFile', { namespace, path, fileId: result.$id });
          return { data: { ...result, path }, error: null };
        } catch (error) { return { data: null, error: appwriteError(error) }; }
      },
      async createSignedUrl(path, expiresIn = 120) {
        try {
          const result = await callApi('fileToken', { namespace, path, expiresIn });
          return { data: { signedUrl: result.url }, error: null };
        } catch (error) { return { data: null, error: appwriteError(error) }; }
      }
    };
  }
};

export const supabase = isConfigured ? {
  auth,
  storage: storageFacade,
  from(table) { return new QueryBuilder(table); },
  async rpc(name, args = {}) {
    try { return { data: await callApi('rpc', { name, args }), error: null }; }
    catch (error) { return { data: null, error: appwriteError(error) }; }
  }
} : null;

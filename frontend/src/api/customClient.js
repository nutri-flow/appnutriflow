const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function getTenantId() {
  const stored = localStorage.getItem('nutriflow_tenant_id') || localStorage.getItem('nutriflow_organization_id');
  const parsed = Number(stored ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getRequestHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': String(getTenantId()),
    'x-organization-id': String(getTenantId()),
    ...(extra.headers || {}),
  };
}

const entityMap = {
  Patient: 'patients',
  Consultation: 'consultations',
  Diet: 'diets',
  FinancialRecord: 'financial-records',
  Material: 'materials',
  Production: 'productions',
  Evolution: 'evolutions',
  Template: 'templates',
  Organization: 'organizations',
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: getRequestHeaders(options),
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function createEntity(name) {
  const endpoint = entityMap[name] || name.toLowerCase();

  return {
    list: async () => request(`/api/${endpoint}`),
    get: async (id) => request(`/api/${endpoint}/${id}`),
    create: async (payload) => request(`/api/${endpoint}`, { method: 'POST', body: JSON.stringify(payload) }),
    update: async (id, payload) => request(`/api/${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete: async (id) => request(`/api/${endpoint}/${id}`, { method: 'DELETE' }),
    filter: async (criteria = {}) => request(`/api/${endpoint}?${new URLSearchParams(criteria).toString()}`),
  };
}

export const customDb = {
  auth: {
    isAuthenticated: async () => true,
    me: async () => {
      const stored = localStorage.getItem('nutriflow_user');
      const currentUser = stored ? JSON.parse(stored) : { id: 1, email: 'demo@nutriflow.local', name: 'Usuário' };
      currentUser.organization_id = currentUser.organization_id ?? getTenantId();
      return currentUser;
    },
    logout: () => localStorage.removeItem('nutriflow_user'),
    redirectToLogin: () => {},
    loginViaEmailPassword: async (email, password) => {
      const tenantId = getTenantId();
      localStorage.setItem('nutriflow_user', JSON.stringify({ email, password, id: 1, organization_id: tenantId }));
      localStorage.setItem('nutriflow_tenant_id', String(tenantId));
      localStorage.setItem('nutriflow_organization_id', String(tenantId));
      return { ok: true };
    },
    loginWithProvider: async () => ({ ok: true }),
    register: async (payload) => {
      const tenantId = payload.organization_id ?? getTenantId();
      localStorage.setItem('nutriflow_user', JSON.stringify({ id: 1, ...payload, organization_id: tenantId }));
      localStorage.setItem('nutriflow_tenant_id', String(tenantId));
      localStorage.setItem('nutriflow_organization_id', String(tenantId));
      return { ok: true };
    },
    verifyOtp: async (payload) => ({ access_token: 'local-token', ...payload }),
    resendOtp: async () => ({ ok: true }),
    resetPasswordRequest: async () => ({ ok: true }),
    resetPassword: async () => ({ ok: true }),
    setToken: (token) => localStorage.setItem('nutriflow_token', token),
  },
  entities: new Proxy({}, {
    get(_target, prop) {
      if (typeof prop === 'string') {
        return createEntity(prop);
      }
      return undefined;
    },
  }),
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: '' }),
    },
  },
};

export default customDb;

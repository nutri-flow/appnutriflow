const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const TOKEN_KEY = 'nutriflow_token';
const USER_KEY = 'nutriflow_user';
const ORG_ID_KEY = 'nutriflow_organization_id';

function getTenantId() {
  const user = getStoredUser();
  if (user?.organization_id) {
    return user.organization_id;
  }
  const stored = localStorage.getItem(ORG_ID_KEY);
  const parsed = Number(stored ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getRequestHeaders(extra = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': String(getTenantId()),
    'x-organization-id': String(getTenantId()),
    ...(extra.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
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
    isAuthenticated: async () => {
      const token = getToken();
      if (!token) return false;
      
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: getRequestHeaders(),
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    me: async () => {
      try {
        const response = await request('/auth/me');
        return response.user;
      } catch (err) {
        console.error('Error fetching user:', err);
        return null;
      }
    },

    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ORG_ID_KEY);
    },

    redirectToLogin: () => {
      window.location.href = '/login';
    },

    loginViaEmailPassword: async (email, password) => {
      try {
        const response = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        if (response.token && response.user) {
          localStorage.setItem(TOKEN_KEY, response.token);
          localStorage.setItem(USER_KEY, JSON.stringify(response.user));
          localStorage.setItem(ORG_ID_KEY, String(response.user.organization_id));
          return response;
        }
      } catch (err) {
        throw new Error(err.message || 'Login failed');
      }
    },

    loginWithProvider: async (provider, idToken, redirectUrl) => {
      if (provider !== 'google') {
        throw new Error(`Provider ${provider} not supported yet`);
      }

      try {
        const response = await request('/auth/google', {
          method: 'POST',
          body: JSON.stringify({ idToken }),
        });

        if (response.token && response.user) {
          localStorage.setItem(TOKEN_KEY, response.token);
          localStorage.setItem(USER_KEY, JSON.stringify(response.user));
          localStorage.setItem(ORG_ID_KEY, String(response.user.organization_id));
          
          if (redirectUrl) {
            window.location.href = redirectUrl;
          }
          
          return response;
        }
      } catch (err) {
        throw new Error(err.message || 'OAuth login failed');
      }
    },

    register: async (payload) => {
      try {
        const response = await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (response.token && response.user) {
          localStorage.setItem(TOKEN_KEY, response.token);
          localStorage.setItem(USER_KEY, JSON.stringify(response.user));
          localStorage.setItem(ORG_ID_KEY, String(response.user.organization_id));
          return response;
        }
      } catch (err) {
        throw new Error(err.message || 'Registration failed');
      }
    },

    verifyOtp: async (payload) => {
      // OTP verification - not needed for basic JWT auth
      try {
        const token = getToken();
        if (token) {
          return { access_token: token, ...payload };
        }
      } catch (err) {
        throw new Error(err.message || 'OTP verification failed');
      }
    },

    resendOtp: async (email) => {
      // OTP resend - not needed for basic JWT auth
      return { ok: true };
    },

    resetPasswordRequest: async (email) => {
      try {
        const response = await request('/auth/reset-password-request', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        return response;
      } catch (err) {
        throw new Error(err.message || 'Failed to request password reset');
      }
    },

    resetPassword: async (token, newPassword) => {
      try {
        const response = await request('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token, newPassword }),
        });
        return response;
      } catch (err) {
        throw new Error(err.message || 'Failed to reset password');
      }
    },

    setToken: (token) => {
      localStorage.setItem(TOKEN_KEY, token);
    },
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
      UploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {
              'x-tenant-id': String(getTenantId()),
              'x-organization-id': String(getTenantId()),
              ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}),
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const data = await response.json();
          return { file_url: data.url || data.file_url || '' };
        } catch (err) {
          console.error('Upload error:', err);
          return { file_url: '' };
        }
      },
    },
  },
};

export default customDb;

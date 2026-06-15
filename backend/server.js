import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const DEFAULT_TENANT_ID = Number(process.env.DEFAULT_TENANT_ID || 1);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Initialize Google OAuth Client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ==================== DATABASE INITIALIZATION ====================

async function initializeDatabase() {
  try {
    // Create organizations table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Organization',
        domain TEXT UNIQUE,
        subscription_tier TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add missing columns to organizations if they don't exist
    await pool.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Organization',
      ADD COLUMN IF NOT EXISTS domain TEXT,
      ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(organization_id, email)
      );
    `);

    // Create other tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        nome TEXT,
        email TEXT,
        telefone TEXT,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS consultations (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        paciente_id INTEGER,
        data TIMESTAMP,
        tipo TEXT,
        status TEXT,
        peso NUMERIC,
        altura NUMERIC,
        imc NUMERIC,
        circunferencia_abdominal NUMERIC,
        percentual_gordura NUMERIC,
        observacoes TEXT,
        valor NUMERIC,
        medicamentos TEXT,
        patologias TEXT,
        exercicios TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS diets (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        paciente_id INTEGER,
        nome TEXT,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS financial_records (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        paciente_id INTEGER,
        valor NUMERIC,
        tipo TEXT,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS productions (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        paciente_id INTEGER,
        titulo TEXT,
        conteudo TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        nome TEXT,
        unidade TEXT,
        estoque NUMERIC,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS evolutions (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        paciente_id INTEGER,
        data TIMESTAMP,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        nome TEXT,
        conteudo TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure default organization exists with correct name
    const orgCheck = await pool.query('SELECT id FROM organizations WHERE id = $1', [DEFAULT_TENANT_ID]);
    if (orgCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO organizations (id, name, domain, subscription_tier, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [DEFAULT_TENANT_ID, 'Default Organization', 'localhost', 'free']
      );
    } else {
      // Update default organization with proper name if it doesn't have one
      await pool.query(
        `UPDATE organizations SET name = $1, domain = $2, subscription_tier = $3 WHERE id = $4 AND name IS NULL`,
        ['Default Organization', 'localhost', 'free', DEFAULT_TENANT_ID]
      );
    }

    console.log('✓ Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// ==================== HELPER FUNCTIONS ====================

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function hashPassword(password) {
  return bcryptjs.hash(password, 10);
}

async function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

// ==================== MIDDLEWARE ====================

function extractToken(req) {
  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function authenticateToken(req, res, next) {
  const token = extractToken(req);
  
  // Allow unauthenticated access to auth endpoints
  if (!token) {
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, organization_id, email, name, role, active FROM users WHERE id = $1 AND active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function getTenantId(req) {
  return req.user?.organization_id || DEFAULT_TENANT_ID;
}

function withTenant(payload, tenantId) {
  return {
    ...payload,
    organization_id: payload.organization_id ?? tenantId,
  };
}

// ==================== TABLE MAP ====================

const tableMap = {
  patient: 'patients',
  patients: 'patients',
  consultation: 'consultations',
  consultations: 'consultations',
  diet: 'diets',
  diets: 'diets',
  financialrecord: 'financial_records',
  financialrecords: 'financial_records',
  financial_record: 'financial_records',
  financial_records: 'financial_records',
  material: 'materials',
  materials: 'materials',
  production: 'productions',
  productions: 'productions',
  evolution: 'evolutions',
  evolutions: 'evolutions',
  template: 'templates',
  templates: 'templates',
  organization: 'organizations',
  organizations: 'organizations',
};

function normalizeEntity(entity) {
  return tableMap[String(entity).toLowerCase()] || String(entity).toLowerCase();
}

function buildInsertQuery(table, payload) {
  const fields = Object.keys(payload || {}).filter((k) => payload[k] !== undefined);
  if (!fields.length) return null;
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
  const columns = fields.join(', ');
  return {
    text: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    values: fields.map((field) => payload[field]),
  };
}

function buildUpdateQuery(table, id, payload, tenantId) {
  const fields = Object.keys(payload || {}).filter((k) => k !== 'organization_id' && payload[k] !== undefined);
  if (!fields.length) return null;
  const assignments = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
  return {
    text: `UPDATE ${table} SET ${assignments} WHERE id = $${fields.length + 1} AND organization_id = $${fields.length + 2} RETURNING *`,
    values: [...fields.map((field) => payload[field]), id, tenantId],
  };
}

// ==================== ROUTES - HEALTH ====================

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, message: 'Backend OK', db: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'DB connection failed', error: error.message });
  }
});

// ==================== ROUTES - AUTHENTICATION ====================

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, confirmPassword, organizationName, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create organization
    const orgResult = await pool.query(
      'INSERT INTO organizations (name, domain) VALUES ($1, $2) RETURNING id, name',
      [organizationName || 'My Organization', email.split('@')[0]]
    );

    const organizationId = orgResult.rows[0].id;

    // Create user
    const passwordHash = await hashPassword(password);
    const userResult = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, name, role, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, organization_id, role`,
      [organizationId, email.toLowerCase(), passwordHash, name || email.split('@')[0], 'admin', true]
    );

    const user = userResult.rows[0];
    const token = generateToken({ userId: user.id, organizationId: user.organization_id });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization_id: user.organization_id,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userResult = await pool.query(
      'SELECT id, password_hash, email, name, organization_id, role, active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    if (!user.active) {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ userId: user.id, organizationId: user.organization_id });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization_id: user.organization_id,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

app.post('/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth not configured on server' });
    }

    // Verify the ID token with Google
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || null;

    // Check if user exists
    let userResult = await pool.query(
      'SELECT id, email, name, organization_id, role, active FROM users WHERE email = $1',
      [email]
    );

    let user;
    let organizationId;

    if (userResult.rows.length > 0) {
      // User exists, update profile picture if available
      user = userResult.rows[0];
      organizationId = user.organization_id;

      if (picture) {
        await pool.query(
          'UPDATE users SET name = $1 WHERE id = $2',
          [name, user.id]
        );
      }
    } else {
      // User doesn't exist, create new user + organization
      const orgResult = await pool.query(
        'INSERT INTO organizations (name, domain) VALUES ($1, $2) RETURNING id, name',
        [name, email.split('@')[1] || email.split('@')[0]]
      );

      organizationId = orgResult.rows[0].id;

      // Create user with OAuth (no password hash needed, use a random one)
      const tempPassword = await hashPassword(googleId); // Use googleId as base for password hash
      const newUserResult = await pool.query(
        `INSERT INTO users (organization_id, email, password_hash, name, role, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name, organization_id, role`,
        [organizationId, email, tempPassword, name, 'admin', true]
      );

      user = newUserResult.rows[0];
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id, organizationId });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization_id: organizationId,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed: ' + error.message });
  }
});

app.get('/auth/me', authenticateToken, requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      organization_id: req.user.organization_id,
      role: req.user.role,
    },
  });
});

app.post('/auth/logout', (req, res) => {
  res.json({ ok: true, message: 'Logged out successfully' });
});

app.post('/auth/refresh', (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const newToken = generateToken({ userId: decoded.userId, organizationId: decoded.organizationId });
    res.json({ token: newToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROUTES - CRUD OPERATIONS ====================

app.use(authenticateToken);

app.get('/api/:entity', async (req, res) => {
  try {
    const table = normalizeEntity(req.params.entity);
    const tenantId = getTenantId(req);
    const result = await pool.query(`SELECT * FROM ${table} WHERE organization_id = $1 ORDER BY id DESC`, [tenantId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/:entity/:id', async (req, res) => {
  try {
    const table = normalizeEntity(req.params.entity);
    const tenantId = getTenantId(req);
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1 AND organization_id = $2`, [req.params.id, tenantId]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/:entity', requireAuth, async (req, res) => {
  try {
    const table = normalizeEntity(req.params.entity);
    const tenantId = getTenantId(req);
    const payload = withTenant(req.body, tenantId);
    const query = buildInsertQuery(table, payload);
    if (!query) return res.status(400).json({ error: 'No fields provided' });
    const result = await pool.query(query.text, query.values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/:entity/:id', requireAuth, async (req, res) => {
  try {
    const table = normalizeEntity(req.params.entity);
    const tenantId = getTenantId(req);
    const payload = withTenant(req.body, tenantId);
    const query = buildUpdateQuery(table, req.params.id, payload, tenantId);
    if (!query) return res.status(400).json({ error: 'No fields provided' });
    const result = await pool.query(query.text, query.values);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/:entity/:id', requireAuth, async (req, res) => {
  try {
    const table = normalizeEntity(req.params.entity);
    const tenantId = getTenantId(req);
    await pool.query(`DELETE FROM ${table} WHERE id = $1 AND organization_id = $2`, [req.params.id, tenantId]);
    res.json({ ok: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STARTUP ====================

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`
╔════════════════════════════════════════════╗
║     NUTRIFLOW BACKEND - RUNNING            ║
║     Port: ${String(port).padEnd(37)}║
║     Multi-tenant: Enabled                  ║
║     Authentication: JWT                    ║
║     http://localhost:${String(port).padEnd(31)}║
╚════════════════════════════════════════════╝
      `);
    });
  })
  .catch((error) => {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  });

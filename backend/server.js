import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const DEFAULT_TENANT_ID = Number(process.env.DEFAULT_TENANT_ID || 1);

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
      nome TEXT,
      email TEXT,
      telefone TEXT,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS consultations (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
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
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS diets (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
      paciente_id INTEGER,
      nome TEXT,
      descricao TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS financial_records (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
      paciente_id INTEGER,
      valor NUMERIC,
      tipo TEXT,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS productions (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
      paciente_id INTEGER,
      titulo TEXT,
      conteudo TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
      nome TEXT,
      unidade TEXT,
      estoque NUMERIC,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS evolutions (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
      paciente_id INTEGER,
      data TIMESTAMP,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
      nome TEXT,
      conteudo TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER DEFAULT 1,
      nome TEXT,
      email TEXT,
      telefone TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const tables = ['patients', 'consultations', 'diets', 'financial_records', 'productions', 'materials', 'evolutions', 'templates', 'organizations'];
  for (const table of tables) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS organization_id INTEGER DEFAULT ${DEFAULT_TENANT_ID}`);
  }
}

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

function getTenantId(req) {
  const raw = req.get('x-tenant-id') || req.get('x-organization-id') || req.query.organization_id || req.query.tenant_id;
  const parsed = Number(raw ?? DEFAULT_TENANT_ID);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TENANT_ID;
}

function withTenant(payload, tenantId) {
  return {
    ...payload,
    organization_id: payload.organization_id ?? tenantId,
  };
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

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, message: 'Backend OK', db: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'DB connection failed', error: error.message });
  }
});

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

app.post('/api/:entity', async (req, res) => {
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

app.put('/api/:entity/:id', async (req, res) => {
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

app.delete('/api/:entity/:id', async (req, res) => {
  try {
    const table = normalizeEntity(req.params.entity);
    const tenantId = getTenantId(req);
    await pool.query(`DELETE FROM ${table} WHERE id = $1 AND organization_id = $2`, [req.params.id, tenantId]);
    res.json({ ok: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
}).catch((error) => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});

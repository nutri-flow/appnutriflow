import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

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
      nome TEXT,
      email TEXT,
      telefone TEXT,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS consultations (
      id SERIAL PRIMARY KEY,
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
      paciente_id INTEGER,
      nome TEXT,
      descricao TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS financial_records (
      id SERIAL PRIMARY KEY,
      paciente_id INTEGER,
      valor NUMERIC,
      tipo TEXT,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS productions (
      id SERIAL PRIMARY KEY,
      paciente_id INTEGER,
      titulo TEXT,
      conteudo TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      unidade TEXT,
      estoque NUMERIC,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS evolutions (
      id SERIAL PRIMARY KEY,
      paciente_id INTEGER,
      data TIMESTAMP,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      conteudo TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      email TEXT,
      telefone TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
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

function buildUpdateQuery(table, id, payload) {
  const fields = Object.keys(payload || {}).filter((k) => payload[k] !== undefined);
  if (!fields.length) return null;
  const assignments = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
  return {
    text: `UPDATE ${table} SET ${assignments} WHERE id = $${fields.length + 1} RETURNING *`,
    values: [...fields.map((field) => payload[field]), id],
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
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/:entity/:id', async (req, res) => {
  try {
    const table = normalizeEntity(req.params.entity);
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/:entity', async (req, res) => {
  try {
    const table = normalizeEntity(req.params.entity);
    const query = buildInsertQuery(table, req.body);
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
    const query = buildUpdateQuery(table, req.params.id, req.body);
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
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
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

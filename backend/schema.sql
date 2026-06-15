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

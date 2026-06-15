# Google OAuth 2.0 Configuration - NUTRIFLOW

## Status: ✅ IMPLEMENTADO E PRONTO

O login com Google está completamente implementado e pronto para ser configurado com suas credenciais do Google.

## Fluxo de Autenticação Google

```
┌─────────────────────┐
│   Frontend (React)  │
│  Google Sign-In     │
│  Library            │
└────────┬────────────┘
         │ (1) Usuário clica "Sign in with Google"
         │
         ▼
┌──────────────────────────┐
│  Google Identity         │
│  Console (popup)         │
│  Autentica usuário       │
└────────┬─────────────────┘
         │ (2) Retorna idToken
         │
         ▼
┌────────────────────────────┐
│  Frontend customClient.js  │
│  Envia idToken para       │
│  POST /auth/google        │
└────────┬───────────────────┘
         │ (3) POST /auth/google + idToken
         │
         ▼
┌─────────────────────────────┐
│  Backend - /auth/google     │
│  1. Valida idToken com      │
│     Google Auth Library     │
│  2. Extrai: email, name,    │
│     picture                 │
│  3. Verifica se user existe │
│  4. Se não existe:          │
│     - Cria organization     │
│     - Cria user (novo)      │
│  5. Se existe:              │
│     - Atualiza perfil       │
│  6. Gera JWT token          │
└────────┬────────────────────┘
         │ (4) Retorna token + user
         │
         ▼
┌──────────────────────────┐
│  Frontend               │
│  Salva no localStorage: │
│  - token (JWT)          │
│  - user info            │
│  - organization_id      │
└──────────────────────────┘
```

## Passo 1: Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Identity Services API** (antigamente "Google+ API")

## Passo 2: Criar OAuth 2.0 Credenciais

### No Google Cloud Console:

1. Vá para **APIs & Services** > **Credentials**
2. Clique em **Create Credentials** > **OAuth 2.0 Client ID**
3. Selecione **Web application**
4. Preencha os campos:

**Authorized JavaScript Origins:**
```
http://localhost:5173
http://localhost:3000
https://seu-dominio.com
```

**Authorized Redirect URIs:**
```
http://localhost:5173/login
http://localhost:3000/login
https://seu-dominio.com/login
```

5. Clique em **Create**
6. Copie o **Client ID** gerado

## Passo 3: Configurar Variáveis de Ambiente

### Frontend - `frontend/.env.local`

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID_FROM_GOOGLE>
```

**Exemplo:**
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnop.apps.googleusercontent.com
```

### Backend - `backend/.env`

```env
DATABASE_URL=postgresql://...
JWT_SECRET=seu-secret-key
JWT_EXPIRE=7d
PORT=4000
GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID_FROM_GOOGLE>
GOOGLE_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
```

**Exemplo:**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=nutriflow-super-secret-key
JWT_EXPIRE=7d
PORT=4000
GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbcDefGhIjKlMnOpQrStUvW
```

## Passo 4: Componentes Implementados

### Frontend - GoogleSignIn Component

**Localização:** `frontend/src/components/GoogleSignIn.jsx`

**Uso em Login:**
```jsx
import GoogleSignIn from '@/components/GoogleSignIn';

export default function Login() {
  const handleGoogleSuccess = async (idToken) => {
    await db.auth.loginWithProvider("google", idToken, "/");
  };

  const handleGoogleError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <GoogleSignIn 
      onSuccess={handleGoogleSuccess}
      onError={handleGoogleError}
      isLoading={loading}
    />
  );
}
```

**Uso em Register:**
```jsx
import GoogleSignIn from '@/components/GoogleSignIn';

export default function Register() {
  const handleGoogleSuccess = async (idToken) => {
    await db.auth.loginWithProvider("google", idToken, "/");
  };

  return (
    <GoogleSignIn 
      onSuccess={handleGoogleSuccess}
      onError={handleGoogleError}
      isLoading={loading}
    />
  );
}
```

### Backend - OAuth Endpoint

**Endpoint:** `POST /auth/google`

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

**Response (201 - Novo usuário):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "usuario@gmail.com",
    "name": "Nome do Usuário",
    "organization_id": 2,
    "role": "admin"
  }
}
```

**Response (200 - Usuário existente):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "usuario@gmail.com",
    "name": "Nome Atualizado",
    "organization_id": 2,
    "role": "admin"
  }
}
```

## Passo 5: Testar Localmente

### 1. Iniciar Backend

```bash
cd backend
npm start
```

### 2. Iniciar Frontend

```bash
cd frontend
npm run dev
# Acesse http://localhost:5173
```

### 3. Clique em "Continue with Google"

- Selecione sua conta Google
- A página deve redirecionar para `/` após login bem-sucedido
- Token deve estar armazenado em `localStorage`

## Passo 6: Testar com API

### Teste de ID Token Válido

```bash
# 1. Obtenha um idToken real clicando em "Continue with Google" no navegador
# 2. No console do navegador, execute:
localStorage.getItem('nutriflow_token')

# 3. Use o token em uma requisição:
curl -X GET http://localhost:4000/api/patients \
  -H "Authorization: Bearer <TOKEN_AQUI>"
```

## Fluxo de Dados Multi-Tenant com Google

```
Google OAuth Login
    ↓
┌─────────────────────────────────┐
│ Backend valida idToken          │
│ Extrai: email, name, picture    │
└────────┬────────────────────────┘
         ↓
    User existe?
    ↙            ↘
   SIM            NÃO
   ↓              ↓
Update       Create Org + User
Profile       (multi-tenant)
   ↓              ↓
   └──────┬───────┘
          ↓
   Gera JWT Token
   (userId + organizationId)
          ↓
   Frontend armazena
   token + user info
          ↓
   Requests automáticos
   incluem Authorization header
```

## Campos Adicionados no Registro

Ao se registrar com Google, o formulário também solicita:

1. **Full Name** (pré-preenchido com nome do Google)
2. **Organization Name** (para criar novo tenant)
3. **Email** (pré-preenchido com email do Google)
4. **Password** (não necessário para Google OAuth, mas pode adicionar depois)

## Segurança

### O que é verificado:

✅ **ID Token Signature** - Validado com as chaves públicas do Google
✅ **Audience** - Token foi emitido para seu `GOOGLE_CLIENT_ID`
✅ **Expiration** - Token não expirou
✅ **Issuer** - Token foi emitido pelo Google (`accounts.google.com`)

### Como funciona:

```javascript
// Backend valida:
const ticket = await googleClient.verifyIdToken({
  idToken: idToken,  // Token do frontend
  audience: GOOGLE_CLIENT_ID,  // Só aceita tokens para YOUR app
});

// Extrai dados verificados:
const payload = ticket.getPayload();
// payload.sub (Google User ID)
// payload.email (Email verificado)
// payload.name (Nome)
// payload.picture (Foto de perfil)
```

## Troubleshooting

### "Google Client ID not configured"

- Defina `VITE_GOOGLE_CLIENT_ID` em `frontend/.env.local`
- Reinicie o servidor frontend

### "Invalid Google token"

- O token pode ter expirado
- `GOOGLE_CLIENT_ID` no backend não corresponde
- Token foi emitido por um projeto Google diferente

### Botão Google não aparece

- Verifique se `https://accounts.google.com/gsi/client` está carregando
- Console do navegador deve mostrar: `window.google.accounts.id.initialize`
- Verifique se `VITE_GOOGLE_CLIENT_ID` está correto

### "Email already registered"

- Usuário já tem conta
- Use login com email/senha em vez de Google
- Ou use outro email do Google

## Próximos Passos

1. ✅ Backend OAuth implementado
2. ✅ Frontend GoogleSignIn pronto
3. ⏳ Obter credenciais do Google Cloud Console
4. ⏳ Configurar variáveis de ambiente
5. ⏳ Testar fluxo completo
6. ⏳ Deploy em produção

## Referências

- [Google Identity Services Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/sign-in/web/sign-in)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/browser-ajs)

## Configuração em Produção

Certifique-se de usar:

```env
# Frontend (.env.production)
VITE_API_BASE_URL=https://seu-api.com
VITE_GOOGLE_CLIENT_ID=<PROD_CLIENT_ID>

# Backend (.env)
NODE_ENV=production
JWT_SECRET=<GERE_UMA_CHAVE_ALEATÓRIA_SEGURA>
GOOGLE_CLIENT_ID=<PROD_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<PROD_CLIENT_SECRET>
```

**Gere uma chave JWT segura com:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

**Data**: 15 de Junho de 2026  
**Status**: ✅ Implementado e Pronto para Configuração  
**Suporte**: Consulte os logs do backend para erros OAuth

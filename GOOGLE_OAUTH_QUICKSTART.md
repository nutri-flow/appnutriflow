# 🚀 Google OAuth - QUICK START

## O que foi implementado ✅

- ✅ Backend endpoint `/auth/google` - valida Google tokens
- ✅ Frontend componente `GoogleSignIn.jsx` - renderiza botão do Google
- ✅ Login page - integrado com Google Sign-In
- ✅ Register page - integrado com Google Sign-In
- ✅ npm packages instalados - google-auth-library pronto
- ✅ Variáveis de ambiente criadas - prontas para suas credenciais

## Configurar em 5 minutos ⏱️

### 1️⃣ Acesse Google Cloud Console
- Vá para: https://console.cloud.google.com/
- Crie um novo projeto (ou use existente)

### 2️⃣ Ative Google Identity Services API
- Vá para **APIs & Services** > **Library**
- Procure por "Google+ API" ou "Google Identity Services"
- Clique em **Enable**

### 3️⃣ Crie OAuth 2.0 Credentials
- Vá para **APIs & Services** > **Credentials**
- Clique **Create Credentials** > **OAuth 2.0 Client ID**
- Selecione **Web application**

**Configure estes domínios:**

**Authorized JavaScript Origins:**
```
http://localhost:5173
http://localhost:3000
```

**Authorized Redirect URIs:**
```
http://localhost:5173/login
http://localhost:3000/login
```

- Clique **Create**
- **Copie o Client ID que apareceu**

### 4️⃣ Salve as Credenciais

**Frontend - `frontend/.env.local`:**
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI
```

**Backend - `backend/.env`:**
```env
GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=SEU_SECRET_AQUI
```

### 5️⃣ Teste!

```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

Acesse http://localhost:5173 e clique em **"Continue with Google"** 🎉

## O que faz no background 🔍

```
Clica "Continue with Google"
        ↓
Popup Google aparece, você seleciona conta
        ↓
Frontend recebe idToken seguro
        ↓
Envia para Backend POST /auth/google
        ↓
Backend valida com Google (verifica assinatura)
        ↓
Se primeira vez: Cria Organization + User
Se já existe: Apenas faz login
        ↓
Retorna JWT Token
        ↓
Frontend salva no localStorage
        ↓
Você está autenticado! ✅
```

## Se algo não funcionar 🐛

### Botão do Google não aparece?
```
- Cheque: VITE_GOOGLE_CLIENT_ID em frontend/.env.local
- Reinicie: npm run dev
- Console: Procure por erros
```

### Diz "Invalid token"?
```
- Cheque: GOOGLE_CLIENT_ID é igual em frontend e backend?
- Cheque: Client ID no Google Cloud está correto?
- Cheque: JavaScript Origins foram adicionadas?
```

### Diz "User already exists"?
```
- Você pode estar com outro email já registrado
- Use outro email do Google
- Ou faça login com email/senha
```

## Arquivos Modificados 📝

```
frontend/src/components/GoogleSignIn.jsx     ← Novo! Renderiza botão
frontend/src/pages/Login.jsx                 ← Integrado Google Sign-In
frontend/src/pages/Register.jsx              ← Integrado Google Sign-In
frontend/.env.local                          ← Novo! Suas credenciais
backend/.env                                 ← Adicionado GOOGLE_CLIENT_ID
backend/server.js                            ← Adicionado /auth/google endpoint
backend/package.json                         ← google-auth-library adicionado
```

## Para Produção 🌐

Quando for fazer deploy:

1. Adicione URL de produção no Google Cloud Console
   - Exemplo: https://seu-app.com

2. Gere novo Client ID para produção

3. Configure variáveis de ambiente em produção
   - Frontend: `VITE_GOOGLE_CLIENT_ID=<prod-id>`
   - Backend: `GOOGLE_CLIENT_ID=<prod-id>`

4. Mude `NODE_ENV=production` no backend

## Documentação Completa 📚

Veja `GOOGLE_OAUTH_README.md` para documentação técnica detalhada.

---

**Pronto? Vamos lá! 🚀**

Siga os 5 passos acima e seu Google OAuth estará funcionando em minutos!

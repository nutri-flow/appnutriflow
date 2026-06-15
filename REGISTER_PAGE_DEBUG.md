# 🔧 Solução: Página /register Não Aparecendo

## Problema
Quando você clica em "Registrar", a página `/register` fica em branco.

## Causas Possíveis

### 1️⃣ **Google Sign-In Não Configurado** (Mais Provável)
O `VITE_GOOGLE_CLIENT_ID` em `frontend/.env.local` está como placeholder:
```env
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE  ❌
```

**Solução:**
- Obtenha um `GOOGLE_CLIENT_ID` real do Google Cloud Console
- Ou remova/comente o GoogleSignIn do Register.jsx enquanto testa

### 2️⃣ **Backend Não Está Rodando**
Se o backend está em erro (Exit Code 1), os endpoints `/auth/me`, `/auth/register` não funcionam.

**Solução:**
```bash
cd backend
npm install
node server.js
```

### 3️⃣ **Erro no Console do Navegador**
Abra DevTools (F12) → Console e procure por erros vermelhos.

## Como Testar Agora

### Opção A: Com Google Sign-In Desabilitado (Rápido)
```javascript
// Edite: frontend/src/pages/Register.jsx
// Remova/comente:
// <GoogleSignIn 
//   onSuccess={handleGoogleSuccess}
//   onError={handleGoogleError}
//   isLoading={loading}
// />
```

### Opção B: Com Google Cloud Credentials (Correto)
1. Acesse: https://console.cloud.google.com/
2. Crie OAuth 2.0 Web credentials
3. Configure:
   ```bash
   # frontend/.env.local
   VITE_GOOGLE_CLIENT_ID=seu_client_id_real_aqui
   ```

## Checklist de Troubleshooting

- [ ] Backend rodando em http://localhost:4000
  ```bash
  curl http://localhost:4000/health
  ```

- [ ] Frontend rodando em http://localhost:5173
  ```bash
  # Terminal mostrar algo como:
  #  VITE v5.x.x  ready in XXX ms
  #  ➜  Local:   http://localhost:5173/
  ```

- [ ] Console do navegador (F12) sem erros vermelhos

- [ ] VITE_GOOGLE_CLIENT_ID configurado corretamente ou desabilitado

## Logs Úteis

### Backend Deve Mostrar:
```
🔐 JWT Auth enabled
📦 Database connected
✅ Server running on port 4000
```

### Frontend Deve Mostrar:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

## Próximos Passos

1. **Confirme que backend está rodando:**
   ```bash
   cd backend && node server.js
   ```

2. **Confirme que frontend está rodando:**
   ```bash
   cd frontend && npm run dev
   ```

3. **Abra DevTools (F12) e verifique console por erros**

4. **Se tudo falhar, crie um teste simples sem Google:**
   - Remova GoogleSignIn do Register
   - Teste formulário de registro básico
   - Depois re-ative Google quando funcionar

---

**Status:** Código está correto, provável problema é configuração de credenciais Google ou backend não rodando.

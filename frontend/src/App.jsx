import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Consultas from './pages/Consultas';
import Producoes from './pages/Producoes';
import Dietas from './pages/Dietas';
import Templates from './pages/Templates';
import Materiais from './pages/Materiais';
import Evolucao from './pages/Evolucao';
import Financeiro from './pages/Financeiro';
import Agenda from './pages/Agenda';
import Configuracoes from './pages/Configuracoes';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/consultas" element={<Consultas />} />
        <Route path="/producoes" element={<Producoes />} />
        <Route path="/dietas" element={<Dietas />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/materiais" element={<Materiais />} />
        <Route path="/evolucao" element={<Evolucao />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
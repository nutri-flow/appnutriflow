import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Stethoscope, ClipboardList,
  UtensilsCrossed, BookOpen, FileText, TrendingUp,
  DollarSign, Calendar, Settings, Menu, X, Leaf
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Pacientes', path: '/pacientes', icon: Users },
  { label: 'Consultas', path: '/consultas', icon: Stethoscope },
  { label: 'Produções', path: '/producoes', icon: ClipboardList },
  { label: 'Dietas', path: '/dietas', icon: UtensilsCrossed },
  { label: 'Templates', path: '/templates', icon: FileText },
  { label: 'Materiais', path: '/materiais', icon: BookOpen },
  { label: 'Evolução', path: '/evolucao', icon: TrendingUp },
  { label: 'Financeiro', path: '/financeiro', icon: DollarSign },
  { label: 'Agenda', path: '/agenda', icon: Calendar },
];

export default function Layout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      "flex flex-col bg-white border-r border-border h-full",
      mobile ? "w-64" : "w-60 hidden lg:flex"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center">
          <Leaf className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg text-slate-900 font-display">NutriFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-emerald-600" : "text-slate-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border">
        <Link
          to="/configuracoes"
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
            pathname === '/configuracoes'
              ? "bg-emerald-50 text-emerald-700 font-semibold"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0 text-slate-400" />
          Configurações
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-slate-900 font-display">NutriFlow</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
import db from '@/api/customClient';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Link } from 'react-router-dom';
import {
  Users, Stethoscope, AlertTriangle,
  CheckCircle2, Clock, DollarSign, Zap,
  ArrowRight, Calendar, Star
} from 'lucide-react';
import { format, isToday, isPast, addDays, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PERIODS = ['Hoje', 'Semana', 'Mês', 'Trimestre', 'Ano'];

const priorityColors = {
  'Alta': 'bg-red-100 text-red-700',
  'Média': 'bg-amber-100 text-amber-700',
  'Baixa': 'bg-blue-100 text-blue-700',
};

function getPeriodRange(period) {
  const now = new Date();
  switch (period) {
    case 'Hoje': return { start: startOfDay(now), end: endOfDay(now) };
    case 'Semana': return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
    case 'Mês': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'Trimestre': return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'Ano': return { start: startOfYear(now), end: endOfYear(now) };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

const StatCard = ({ label, value, icon: IconComp, color, sub }) => (
  <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
        <IconComp size={18} />
      </div>
    </div>
  </div>
);

const ProductionItem = ({ prod, variant }) => {
  const checkItems = ['checklist_dieta', 'checklist_material', 'checklist_receitas', 'checklist_guia', 'checklist_substituicoes', 'checklist_habitos', 'checklist_orientacoes'];
  const total = checkItems.length;
  const done = checkItems.filter(k => prod[k]).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm",
      variant === 'overdue' ? 'border-red-200 bg-red-50' :
      variant === 'today' ? 'border-amber-200 bg-amber-50' :
      variant === 'soon' ? 'border-blue-200 bg-blue-50' :
      'border-green-200 bg-green-50'
    )}>
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
        variant === 'overdue' ? 'bg-red-500' :
        variant === 'today' ? 'bg-amber-500' :
        variant === 'soon' ? 'bg-blue-500' : 'bg-green-500'
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{prod.titulo}</p>
        <p className="text-xs text-muted-foreground truncate">{prod.patient_nome}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColors[prod.prioridade] || 'bg-slate-100 text-slate-600')}>{prod.prioridade}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{pct}%</p>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [period, setPeriod] = useState('Mês');

  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => db.entities.Patient.list() });
  const { data: productions = [] } = useQuery({ queryKey: ['productions'], queryFn: () => db.entities.Production.list() });
  const { data: consultations = [] } = useQuery({ queryKey: ['consultations'], queryFn: () => db.entities.Consultation.list() });
  const { data: financials = [] } = useQuery({ queryKey: ['financials'], queryFn: () => db.entities.FinancialRecord.list() });

  const range = getPeriodRange(period);

  const todayProductions = useMemo(() => {
    const now = new Date();
    return {
      overdue: productions.filter(p => p.prazo && isPast(parseISO(p.prazo)) && !['Concluído', 'Entregue'].includes(p.status)),
      today: productions.filter(p => p.prazo && isToday(parseISO(p.prazo)) && !['Concluído', 'Entregue'].includes(p.status)),
      soon: productions.filter(p => {
        if (!p.prazo) return false;
        const prazo = parseISO(p.prazo);
        return isWithinInterval(prazo, { start: addDays(now, 1), end: addDays(now, 3) }) && !['Concluído', 'Entregue'].includes(p.status);
      }),
      done: productions.filter(p => ['Concluído', 'Entregue'].includes(p.status) && p.data_conclusao && isToday(parseISO(p.data_conclusao))),
    };
  }, [productions]);

  const stats = useMemo(() => {
    const active = patients.filter(p => p.status === 'Ativo');
    const newPatients = patients.filter(p => {
      if (!p.created_date) return false;
      return isWithinInterval(new Date(p.created_date), range);
    });
    const periodConsultations = consultations.filter(c => {
      if (!c.data) return false;
      return isWithinInterval(new Date(c.data), range);
    });
    const pending = productions.filter(p => !['Concluído', 'Entregue'].includes(p.status));
    const done = productions.filter(p => ['Concluído', 'Entregue'].includes(p.status));
    const overdue = productions.filter(p => p.prazo && isPast(parseISO(p.prazo)) && !['Concluído', 'Entregue'].includes(p.status));
    const revenue = financials.filter(f => f.status === 'Pago' && f.data_pagamento && isWithinInterval(parseISO(f.data_pagamento), range)).reduce((s, f) => s + (f.valor || 0), 0);
    return { active: active.length, newPatients: newPatients.length, consultations: periodConsultations.length, pending: pending.length, done: done.length, overdue: overdue.length, revenue };
  }, [patients, productions, consultations, financials, range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bom dia! 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <div className="flex bg-white border border-border rounded-xl p-1 gap-1 shadow-sm flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                period === p ? 'bg-slate-900 text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary'
              )}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard label="Pacientes Ativos" value={stats.active} icon={Users} color="bg-blue-100 text-blue-600" />
        <StatCard label="Novos Pacientes" value={stats.newPatients} icon={Users} color="bg-indigo-100 text-indigo-600" sub={period} />
        <StatCard label="Consultas" value={stats.consultations} icon={Stethoscope} color="bg-violet-100 text-violet-600" sub={period} />
        <StatCard label="Pendentes" value={stats.pending} icon={Clock} color="bg-amber-100 text-amber-600" />
        <StatCard label="Concluídas" value={stats.done} icon={CheckCircle2} color="bg-green-100 text-green-600" />
        <StatCard label="Atrasadas" value={stats.overdue} icon={AlertTriangle} color="bg-red-100 text-red-600" />
        <StatCard label="Receita" value={`R$${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} icon={DollarSign} color="bg-emerald-100 text-emerald-600" sub={period} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Production Today */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              Minha Produção Hoje
            </h2>
            <Link to="/producoes" className="text-xs text-emerald-700 font-medium flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-sm text-foreground">Atrasadas</h3>
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{todayProductions.overdue.length}</span>
              </div>
              <div className="space-y-2">
                {todayProductions.overdue.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">Nenhuma ✓</p> :
                  todayProductions.overdue.slice(0, 3).map(p => <ProductionItem key={p.id} prod={p} variant="overdue" />)}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-foreground">Para Hoje</h3>
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{todayProductions.today.length}</span>
              </div>
              <div className="space-y-2">
                {todayProductions.today.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">Nenhuma hoje ✓</p> :
                  todayProductions.today.slice(0, 3).map(p => <ProductionItem key={p.id} prod={p} variant="today" />)}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm text-foreground">Próximas (3 dias)</h3>
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{todayProductions.soon.length}</span>
              </div>
              <div className="space-y-2">
                {todayProductions.soon.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">Nenhuma próxima ✓</p> :
                  todayProductions.soon.slice(0, 3).map(p => <ProductionItem key={p.id} prod={p} variant="soon" />)}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold text-sm text-foreground">Concluídas Hoje</h3>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{todayProductions.done.length}</span>
              </div>
              <div className="space-y-2">
                {todayProductions.done.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">Nenhuma concluída ainda</p> :
                  todayProductions.done.slice(0, 3).map(p => <ProductionItem key={p.id} prod={p} variant="done" />)}
              </div>
            </div>
          </div>
        </div>

        {/* Productivity Panel */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            Produtividade
          </h2>

          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
            {[
              { label: 'Produções Concluídas', value: stats.done, max: Math.max(stats.done + stats.pending, 1), color: 'bg-slate-800' },
              { label: 'Taxa de Entrega', value: Math.round((stats.done / Math.max(stats.done + stats.pending + stats.overdue, 1)) * 100), suffix: '%', max: 100, color: 'bg-emerald-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.value}{item.suffix || ''}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} />
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-border space-y-3">
              {[
                { label: 'Horas economizadas est.', value: `~${stats.done * 4}h`, color: 'text-emerald-600' },
                { label: 'Ticket médio', value: financials.filter(f => f.status === 'Pago').length > 0 ? `R$${(financials.filter(f => f.status === 'Pago').reduce((s, f) => s + f.valor, 0) / financials.filter(f => f.status === 'Pago').length).toFixed(0)}` : 'R$0', color: 'text-emerald-600' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={cn("text-sm font-bold", item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground mb-3">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Nova Consulta', path: '/consultas', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                { label: 'Novo Paciente', path: '/pacientes', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                { label: 'Nova Dieta', path: '/dietas', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                { label: 'Novo Template', path: '/templates', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
              ].map(a => (
                <Link key={a.path} to={a.path} className={cn("text-xs font-medium py-2.5 px-3 rounded-xl text-center transition-colors", a.color)}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
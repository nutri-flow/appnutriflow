import db from '@/api/customClient';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ClipboardList, Plus, AlertTriangle, Trash2, X } from 'lucide-react';
import MontadorRapido from '@/components/MontadorRapido';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { isPast, parseISO, format } from 'date-fns';

const COLUMNS = ['Não Iniciado', 'Em Produção', 'Em Revisão', 'Concluído', 'Entregue'];
const colColors = { 'Não Iniciado': 'bg-slate-100', 'Em Produção': 'bg-blue-50', 'Em Revisão': 'bg-amber-50', 'Concluído': 'bg-green-50', 'Entregue': 'bg-emerald-50' };
const priorityColors = { 'Alta': 'bg-red-100 text-red-700', 'Média': 'bg-amber-100 text-amber-700', 'Baixa': 'bg-blue-100 text-blue-700' };
const checkItems = ['checklist_dieta','checklist_material','checklist_receitas','checklist_guia','checklist_substituicoes','checklist_habitos','checklist_orientacoes'];
const checkLabels = { checklist_dieta: 'Dieta', checklist_material: 'Material', checklist_receitas: 'Receitas', checklist_guia: 'Guia', checklist_substituicoes: 'Substituições', checklist_habitos: 'Hábitos', checklist_orientacoes: 'Orientações' };
const EMPTY = { patient_id: '', patient_nome: '', titulo: '', status: 'Não Iniciado', prioridade: 'Média', prazo: '', observacoes: '' };

export default function Producoes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);

  const { data: productions = [], isLoading } = useQuery({ queryKey: ['productions'], queryFn: () => db.entities.Production.list() });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => db.entities.Patient.list() });

  const create = useMutation({ mutationFn: d => db.entities.Production.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['productions'] }); setOpen(false); setForm(EMPTY); } });
  const update = useMutation({ mutationFn: ({ id, data }) => db.entities.Production.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['productions'] }) });
  const remove = useMutation({ mutationFn: id => db.entities.Production.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['productions'] }); setDeleteId(null); } });

  const moveStatus = (prod, newStatus) => {
    const extra = ['Concluído', 'Entregue'].includes(newStatus) ? { data_conclusao: new Date().toISOString().split('T')[0] } : {};
    update.mutate({ id: prod.id, data: { status: newStatus, ...extra } });
  };
  const toggleCheck = (prod, key) => update.mutate({ id: prod.id, data: { [key]: !prod[key] } });

  const handlePatient = (pid) => {
    const p = patients.find(x => x.id === pid);
    setForm(f => ({ ...f, patient_id: pid, patient_nome: p?.nome || '' }));
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-emerald-600" />Produções</h1>
          <p className="text-sm text-muted-foreground">{productions.length} produções</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />Nova Produção</Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const cards = productions.filter(p => p.status === col);
          return (
            <div key={col} className="flex-shrink-0 w-72">
              <div className={cn("rounded-2xl p-3", colColors[col])}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm text-slate-700">{col}</h3>
                  <span className="text-xs bg-white border border-border px-2 py-0.5 rounded-full font-medium text-slate-600">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map(prod => {
                    const done = checkItems.filter(k => prod[k]).length;
                    const pct = Math.round((done / checkItems.length) * 100);
                    const isOverdue = prod.prazo && isPast(parseISO(prod.prazo)) && !['Concluído','Entregue'].includes(prod.status);
                    return (
                      <div key={prod.id} className="bg-white rounded-xl border border-border p-3 shadow-sm space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 leading-tight">{prod.titulo}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{prod.patient_nome}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {prod.prioridade && <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", priorityColors[prod.prioridade])}>{prod.prioridade}</span>}
                            <button onClick={() => setDeleteId(prod.id)} className="p-0.5 hover:text-red-600 text-slate-300"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        {prod.prazo && (
                          <div className={cn("flex items-center gap-1 text-xs", isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                            {isOverdue && <AlertTriangle className="w-3 h-3" />}
                            Prazo: {format(parseISO(prod.prazo), 'dd/MM/yyyy')}
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Progresso</span><span>{pct}%</span></div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {checkItems.map(k => (
                            <button key={k} onClick={() => toggleCheck(prod, k)}
                              className={cn("text-xs px-1.5 py-0.5 rounded border transition-all",
                                prod[k] ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                              )}>{checkLabels[k]}</button>
                          ))}
                        </div>
                        <select className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-slate-50 text-slate-700" value={prod.status} onChange={e => moveStatus(prod, e.target.value)}>
                          {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    );
                  })}
                  {cards.length === 0 && <p className="text-xs text-center text-muted-foreground py-4 opacity-60">Nenhuma aqui</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm(EMPTY); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Produção</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Paciente *</Label>
              <Select value={form.patient_id} onValueChange={handlePatient}>
                <SelectTrigger><SelectValue placeholder="Selecionar paciente" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Título *</Label><Input value={form.titulo} onChange={e => setForm(f => ({...f, titulo: e.target.value}))} placeholder="Ex: Plano Alimentar + Guia" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({...f, prioridade: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Prazo</Label><Input type="date" value={form.prazo} onChange={e => setForm(f => ({...f, prazo: e.target.value}))} /></div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={3} placeholder="Anotações, orientações..." />
            </div>
            <MontadorRapido onInserir={(texto) => setForm(f => ({ ...f, observacoes: f.observacoes ? f.observacoes + '\n\n' + texto : texto }))} />
            <Button onClick={() => create.mutate(form)} disabled={!form.patient_id || !form.titulo || create.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {create.isPending ? 'Salvando...' : 'Criar Produção'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir esta produção?</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => remove.mutate(deleteId)} disabled={remove.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">{remove.isPending ? 'Excluindo...' : 'Excluir'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
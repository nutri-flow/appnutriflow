import db from '@/api/customClient';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { DollarSign, CheckCircle2, Clock, XCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusColors = { 'Pago': 'bg-green-100 text-green-700', 'Pendente': 'bg-amber-100 text-amber-700', 'Cancelado': 'bg-red-100 text-red-600' };
const statusIcons = { 'Pago': CheckCircle2, 'Pendente': Clock, 'Cancelado': XCircle };
const formasPgto = ['Dinheiro','PIX','Cartão de Crédito','Cartão de Débito','Transferência','Outro'];
const EMPTY = { patient_id: '', patient_nome: '', descricao: '', valor: '', status: 'Pendente', data_vencimento: '', data_pagamento: '', forma_pagamento: '' };

export default function Financeiro() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const { data: records = [], isLoading } = useQuery({ queryKey: ['financials'], queryFn: () => db.entities.FinancialRecord.list('-created_date') });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => db.entities.Patient.list() });

  const create = useMutation({ mutationFn: d => db.entities.FinancialRecord.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['financials'] }); closeForm(); } });
  const update = useMutation({ mutationFn: ({ id, d }) => db.entities.FinancialRecord.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['financials'] }); closeForm(); } });
  const remove = useMutation({ mutationFn: id => db.entities.FinancialRecord.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['financials'] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ patient_id: r.patient_id||'', patient_nome: r.patient_nome||'', descricao: r.descricao||'', valor: r.valor||'', status: r.status||'Pendente', data_vencimento: r.data_vencimento||'', data_pagamento: r.data_pagamento||'', forma_pagamento: r.forma_pagamento||'' }); setOpen(true); };
  const closeForm = () => { setOpen(false); setEditing(null); setForm(EMPTY); };
  const marcarPago = (r) => update.mutate({ id: r.id, d: { status: 'Pago', data_pagamento: new Date().toISOString().split('T')[0] } });

  const handlePatient = (pid) => {
    const p = patients.find(x => x.id === pid);
    setForm(f => ({ ...f, patient_id: pid, patient_nome: p?.nome || '' }));
  };

  const handleSave = () => {
    const payload = { ...form, valor: form.valor ? Number(form.valor) : 0 };
    editing ? update.mutate({ id: editing.id, d: payload }) : create.mutate(payload);
  };

  const totalPago = records.filter(r => r.status === 'Pago').reduce((s, r) => s + (r.valor || 0), 0);
  const totalPendente = records.filter(r => r.status === 'Pendente').reduce((s, r) => s + (r.valor || 0), 0);
  const filtered = records.filter(r => !filterStatus || r.status === filterStatus);
  const isPending = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-6 h-6 text-emerald-600" />Financeiro</h1>
          <p className="text-muted-foreground text-sm">{records.length} lançamentos</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />Novo Lançamento</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm text-emerald-700 font-medium">Total Recebido</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">R${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-700 font-medium">A Receber</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">R${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['', 'Pendente', 'Pago', 'Cancelado'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn("text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
              filterStatus === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-border hover:bg-slate-50'
            )}>{s || 'Todos'}</button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div> : (
        <div className="space-y-3">
          {filtered.map(r => {
            const Icon = statusIcons[r.status] || Clock;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={cn("w-5 h-5 flex-shrink-0", r.status === 'Pago' ? 'text-green-500' : r.status === 'Pendente' ? 'text-amber-500' : 'text-red-500')} />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{r.patient_nome || 'Paciente'}</p>
                      <p className="text-xs text-muted-foreground">{r.descricao}</p>
                      <div className="flex gap-2 mt-0.5">
                        {r.data_vencimento && <p className="text-xs text-muted-foreground">Venc.: {format(parseISO(r.data_vencimento), 'dd/MM/yyyy')}</p>}
                        {r.forma_pagamento && <p className="text-xs text-muted-foreground">• {r.forma_pagamento}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">R${(r.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[r.status])}>{r.status}</span>
                    </div>
                    {r.status === 'Pendente' && <Button size="sm" variant="outline" onClick={() => marcarPago(r)} className="text-xs h-7">Pago ✓</Button>}
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum lançamento encontrado.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Paciente</Label>
              <Select value={form.patient_id} onValueChange={handlePatient}>
                <SelectTrigger><SelectValue placeholder="Selecionar paciente" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} placeholder="Ex: Consulta inicial, Plano mensal..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({...f, valor: e.target.value}))} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({...f, data_vencimento: e.target.value}))} /></div>
              <div><Label>Data Pagamento</Label><Input type="date" value={form.data_pagamento} onChange={e => setForm(f => ({...f, data_pagamento: e.target.value}))} /></div>
            </div>
            <div><Label>Forma de Pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={v => setForm(f => ({...f, forma_pagamento: v}))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{formasPgto.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={!form.descricao || !form.valor || isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Lançamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este lançamento?</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => remove.mutate(deleteId)} disabled={remove.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">{remove.isPending ? 'Excluindo...' : 'Excluir'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
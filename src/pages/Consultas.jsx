import db from '@/api/customClient';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Stethoscope, Plus, Search, Calendar, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors = { 'Agendada': 'bg-blue-100 text-blue-700', 'Realizada': 'bg-green-100 text-green-700', 'Cancelada': 'bg-red-100 text-red-600', 'Remarcada': 'bg-amber-100 text-amber-700' };
const EMPTY = { patient_id: '', data: '', tipo: 'Retorno', status: 'Agendada', peso: '', altura: '', imc: '', circunferencia_abdominal: '', percentual_gordura: '', observacoes: '', valor: '', medicamentos: '', patologias: '', exercicios: '' };

export default function Consultas() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);

  const { data: consultations = [], isLoading } = useQuery({ queryKey: ['consultations'], queryFn: () => db.entities.Consultation.list('-data') });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => db.entities.Patient.list() });

  const create = useMutation({ mutationFn: d => db.entities.Consultation.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['consultations'] }); closeForm(); } });
  const update = useMutation({ mutationFn: ({ id, d }) => db.entities.Consultation.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['consultations'] }); closeForm(); } });
  const remove = useMutation({ mutationFn: id => db.entities.Consultation.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['consultations'] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    const dataFormatted = c.data ? new Date(c.data).toISOString().slice(0,16) : '';
    setForm({ patient_id: c.patient_id||'', data: dataFormatted, tipo: c.tipo||'Retorno', status: c.status||'Agendada', peso: c.peso||'', altura: c.altura||'', imc: c.imc||'', circunferencia_abdominal: c.circunferencia_abdominal||'', percentual_gordura: c.percentual_gordura||'', observacoes: c.observacoes||'', valor: c.valor||'', medicamentos: c.medicamentos||'', patologias: c.patologias||'', exercicios: c.exercicios||'' });
    setOpen(true);
  };
  const closeForm = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const handleSave = () => {
    const payload = { ...form, peso: form.peso ? Number(form.peso) : undefined, altura: form.altura ? Number(form.altura) : undefined, imc: form.imc ? Number(form.imc) : undefined, valor: form.valor ? Number(form.valor) : undefined, percentual_gordura: form.percentual_gordura ? Number(form.percentual_gordura) : undefined, circunferencia_abdominal: form.circunferencia_abdominal ? Number(form.circunferencia_abdominal) : undefined };
    editing ? update.mutate({ id: editing.id, d: payload }) : create.mutate(payload);
  };

  const calcIMC = () => {
    if (form.peso && form.altura) {
      const h = Number(form.altura) / 100;
      const imc = (Number(form.peso) / (h * h)).toFixed(1);
      setForm(f => ({ ...f, imc }));
    }
  };

  const patientMap = Object.fromEntries(patients.map(p => [p.id, p.nome]));
  const filtered = consultations.filter(c => (patientMap[c.patient_id] || '').toLowerCase().includes(search.toLowerCase()));
  const isPending = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Stethoscope className="w-6 h-6 text-emerald-600" />Consultas</h1>
          <p className="text-muted-foreground text-sm">{consultations.length} consultas registradas</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />Nova Consulta</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por paciente..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div> : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{patientMap[c.patient_id] || 'Paciente'}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {c.data ? format(new Date(c.data), "d 'de' MMMM 'de' yyyy - HH:mm", { locale: ptBR }) : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.tipo}</span>
                  </div>
                  {(c.peso || c.imc) && <p className="text-xs text-muted-foreground mt-1">{c.peso && `Peso: ${c.peso}kg`}{c.peso && c.imc && ' • '}{c.imc && `IMC: ${c.imc}`}</p>}
                  {c.valor && <p className="text-xs font-semibold text-emerald-600 mt-0.5">R$ {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={cn("text-xs", statusColors[c.status])}>{c.status}</Badge>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhuma consulta encontrada.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Consulta' : 'Nova Consulta'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Paciente *</Label>
              <Select value={form.patient_id} onValueChange={v => setForm(f => ({...f, patient_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Selecionar paciente" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data e Hora *</Label><Input type="datetime-local" value={form.data} onChange={e => setForm(f => ({...f, data: e.target.value}))} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({...f, tipo: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Primeira Consulta">Primeira Consulta</SelectItem><SelectItem value="Retorno">Retorno</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="Emergência">Emergência</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Agendada">Agendada</SelectItem><SelectItem value="Realizada">Realizada</SelectItem><SelectItem value="Cancelada">Cancelada</SelectItem><SelectItem value="Remarcada">Remarcada</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Peso (kg)</Label><Input type="number" value={form.peso} onChange={e => setForm(f => ({...f, peso: e.target.value}))} onBlur={calcIMC} /></div>
              <div><Label>Altura (cm)</Label><Input type="number" value={form.altura} onChange={e => setForm(f => ({...f, altura: e.target.value}))} onBlur={calcIMC} /></div>
              <div><Label>IMC</Label><Input type="number" value={form.imc} onChange={e => setForm(f => ({...f, imc: e.target.value}))} placeholder="Auto" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Circ. Abdominal (cm)</Label><Input type="number" value={form.circunferencia_abdominal} onChange={e => setForm(f => ({...f, circunferencia_abdominal: e.target.value}))} /></div>
              <div><Label>% Gordura</Label><Input type="number" value={form.percentual_gordura} onChange={e => setForm(f => ({...f, percentual_gordura: e.target.value}))} /></div>
            </div>
            <div><Label>Patologias</Label><Input value={form.patologias} onChange={e => setForm(f => ({...f, patologias: e.target.value}))} placeholder="Diabetes, Hipertensão..." /></div>
            <div><Label>Medicamentos</Label><Input value={form.medicamentos} onChange={e => setForm(f => ({...f, medicamentos: e.target.value}))} /></div>
            <div><Label>Exercícios</Label><Input value={form.exercicios} onChange={e => setForm(f => ({...f, exercicios: e.target.value}))} /></div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={3} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm(f => ({...f, valor: e.target.value}))} /></div>
            <Button onClick={handleSave} disabled={!form.patient_id || !form.data || isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Registrar Consulta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir esta consulta?</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => remove.mutate(deleteId)} disabled={remove.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">{remove.isPending ? 'Excluindo...' : 'Excluir'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
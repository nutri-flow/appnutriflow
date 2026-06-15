import db from '@/api/customClient';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Users, Plus, Search, Phone, Mail, Target, Pencil, Trash2, X, DollarSign, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PatientFinancialSummary from '@/components/PatientFinancialSummary';
import PatientWhatsAppDiet from '@/components/PatientWhatsAppDiet';

const statusColors = { 'Ativo': 'bg-green-100 text-green-700', 'Inativo': 'bg-slate-100 text-slate-600', 'Arquivado': 'bg-red-100 text-red-600' };
const objetivos = ['Emagrecimento','Hipertrofia','Saúde Geral','Gestação','Vegetarianismo','Diabetes','Hipertensão','Performance Esportiva','Outro'];
const EMPTY = { nome: '', email: '', telefone: '', whatsapp: '', data_nascimento: '', sexo: '', objetivo_principal: '', status: 'Ativo', observacoes: '', notas_internas: '' };

function PatientCard({ p, onEdit, onDelete }) {
  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-700 font-bold text-sm">{p.nome?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{p.nome}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                {p.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>}
                {p.telefone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{p.telefone}</span>}
              </div>
              {p.objetivo_principal && <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Target className="w-3 h-3" />{p.objetivo_principal}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={cn("text-xs", statusColors[p.status])}>{p.status}</Badge>
            {(p.whatsapp || p.telefone) && (
              <button
                onClick={() => setShowWhatsApp(v => !v)}
                className={cn("p-1.5 rounded-lg transition-all text-slate-400", showWhatsApp ? 'bg-green-100 text-green-700' : 'hover:bg-green-50 hover:text-green-600')}
                title="Enviar dieta via WhatsApp"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowFinanceiro(v => !v)}
              className={cn("p-1.5 rounded-lg transition-all text-slate-400", showFinanceiro ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 hover:text-slate-700')}
              title="Resumo financeiro"
            >
              <DollarSign className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
      {showWhatsApp && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <PatientWhatsAppDiet patient={p} />
        </div>
      )}
      {showFinanceiro && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">Resumo Financeiro</span>
          </div>
          <PatientFinancialSummary patientId={p.id} />
        </div>
      )}
    </div>
  );
}

export default function Pacientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);

  const { data: patients = [], isLoading } = useQuery({ queryKey: ['patients'], queryFn: () => db.entities.Patient.list() });

  const create = useMutation({ mutationFn: d => db.entities.Patient.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); closeForm(); } });
  const update = useMutation({ mutationFn: ({ id, d }) => db.entities.Patient.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); closeForm(); } });
  const remove = useMutation({ mutationFn: id => db.entities.Patient.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ nome: p.nome||'', email: p.email||'', telefone: p.telefone||'', whatsapp: p.whatsapp||'', data_nascimento: p.data_nascimento||'', sexo: p.sexo||'', objetivo_principal: p.objetivo_principal||'', status: p.status||'Ativo', observacoes: p.observacoes||'', notas_internas: p.notas_internas||'' }); setOpen(true); };
  const closeForm = () => { setOpen(false); setEditing(null); setForm(EMPTY); };
  const handleSave = () => editing ? update.mutate({ id: editing.id, d: form }) : create.mutate(form);

  const filtered = patients.filter(p => p.nome?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()));
  const isPending = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Users className="w-6 h-6 text-emerald-600" />Pacientes</h1>
          <p className="text-muted-foreground text-sm">{patients.length} pacientes cadastrados</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />Novo Paciente</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div> : (
        <div className="grid gap-3">
          {filtered.map(p => (
            <PatientCard key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteId} />
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum paciente encontrado.</p>}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} placeholder="Nome completo" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))} /></div>
              <div><Label>Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => setForm(f => ({...f, data_nascimento: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={v => setForm(f => ({...f, sexo: v}))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent><SelectItem value="Feminino">Feminino</SelectItem><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem><SelectItem value="Arquivado">Arquivado</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Objetivo Principal</Label>
              <Select value={form.objetivo_principal} onValueChange={v => setForm(f => ({...f, objetivo_principal: v}))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{objetivos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={2} /></div>
            <div><Label>Notas Internas</Label><Textarea value={form.notas_internas} onChange={e => setForm(f => ({...f, notas_internas: e.target.value}))} rows={2} placeholder="Visível apenas para você" /></div>
            <Button onClick={handleSave} disabled={!form.nome || isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => remove.mutate(deleteId)} disabled={remove.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              {remove.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
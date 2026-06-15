import db from '@/api/customClient';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { TrendingUp, Plus, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const EMPTY = { patient_id: '', patient_nome: '', data: '', peso: '', altura: '', imc: '', percentual_gordura: '', circunferencia_abdominal: '', circunferencia_quadril: '', circunferencia_braco: '', circunferencia_coxa: '', massa_muscular: '', observacoes: '' };

export default function Evolucao() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [dietaFromEvolucao, setDietaFromEvolucao] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);

  const { data: evolutions = [], isLoading } = useQuery({ queryKey: ['evolutions'], queryFn: () => db.entities.Evolution.list('-data') });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => db.entities.Patient.list() });

  const create = useMutation({ mutationFn: d => db.entities.Evolution.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['evolutions'] }); closeForm(); } });
  const update = useMutation({ mutationFn: ({ id, d }) => db.entities.Evolution.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['evolutions'] }); closeForm(); } });
  const remove = useMutation({ mutationFn: id => db.entities.Evolution.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['evolutions'] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ patient_id: e.patient_id||'', patient_nome: e.patient_nome||'', data: e.data||'', peso: e.peso||'', altura: e.altura||'', imc: e.imc||'', percentual_gordura: e.percentual_gordura||'', circunferencia_abdominal: e.circunferencia_abdominal||'', circunferencia_quadril: e.circunferencia_quadril||'', circunferencia_braco: e.circunferencia_braco||'', circunferencia_coxa: e.circunferencia_coxa||'', massa_muscular: e.massa_muscular||'', observacoes: e.observacoes||'' }); setOpen(true); };
  const closeForm = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const handlePatient = (pid) => {
    const p = patients.find(x => x.id === pid);
    setForm(f => ({ ...f, patient_id: pid, patient_nome: p?.nome || '' }));
  };

  const calcIMC = () => {
    if (form.peso && form.altura) {
      const h = Number(form.altura) / 100;
      setForm(f => ({ ...f, imc: (Number(form.peso) / (h * h)).toFixed(1) }));
    }
  };

  const handleSave = () => {
    const toNum = v => v !== '' ? Number(v) : undefined;
    const payload = { ...form, peso: toNum(form.peso), altura: toNum(form.altura), imc: toNum(form.imc), percentual_gordura: toNum(form.percentual_gordura), circunferencia_abdominal: toNum(form.circunferencia_abdominal), circunferencia_quadril: toNum(form.circunferencia_quadril), circunferencia_braco: toNum(form.circunferencia_braco), circunferencia_coxa: toNum(form.circunferencia_coxa), massa_muscular: toNum(form.massa_muscular) };
    editing ? update.mutate({ id: editing.id, d: payload }) : create.mutate(payload);
  };

  const [activeLines, setActiveLines] = useState({ peso: true, imc: true, gordura: true, abdominal: false, muscular: false });
  const toggleLine = (key) => setActiveLines(p => ({ ...p, [key]: !p[key] }));

  const patientIds = [...new Set(evolutions.map(e => e.patient_id))];
  const filtered = evolutions.filter(e => !selectedPatient || e.patient_id === selectedPatient).sort((a, b) => new Date(a.data) - new Date(b.data));
  const chartData = filtered.map(e => ({
    data: e.data ? format(parseISO(e.data), 'dd/MM') : '',
    peso: e.peso || null,
    imc: e.imc || null,
    gordura: e.percentual_gordura || null,
    abdominal: e.circunferencia_abdominal || null,
    muscular: e.massa_muscular || null,
  }));
  const isPending = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-emerald-600" />Evolução</h1>
          <p className="text-muted-foreground text-sm">{evolutions.length} registros</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />Novo Registro</Button>
      </div>

      <Select value={selectedPatient} onValueChange={setSelectedPatient}>
        <SelectTrigger className="w-64"><SelectValue placeholder="Todos os pacientes" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Todos os pacientes</SelectItem>
          {patients.filter(p => patientIds.includes(p.id)).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
        </SelectContent>
      </Select>

      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-slate-900">Evolução de Medidas</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'peso', label: 'Peso (kg)', color: '#059669' },
                { key: 'imc', label: 'IMC', color: '#6366f1' },
                { key: 'gordura', label: '% Gordura', color: '#f59e0b' },
                { key: 'abdominal', label: 'Abdominal (cm)', color: '#ef4444' },
                { key: 'muscular', label: 'Muscular (kg)', color: '#3b82f6' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => toggleLine(key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${activeLines[key] ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200'}`}
                  style={activeLines[key] ? { backgroundColor: color, borderColor: color } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
              {activeLines.peso && <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} connectNulls />}
              {activeLines.imc && <Line type="monotone" dataKey="imc" name="IMC" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} connectNulls />}
              {activeLines.gordura && <Line type="monotone" dataKey="gordura" name="% Gordura" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} connectNulls />}
              {activeLines.abdominal && <Line type="monotone" dataKey="abdominal" name="Abdominal (cm)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} connectNulls />}
              {activeLines.muscular && <Line type="monotone" dataKey="muscular" name="Muscular (kg)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} connectNulls />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {isLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div> : (
        <div className="space-y-3">
          {[...filtered].reverse().map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{e.patient_nome}</p>
                  <p className="text-xs text-muted-foreground">{e.data ? format(parseISO(e.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-3 text-right">
                    {e.peso && <div><p className="text-lg font-bold text-emerald-600">{e.peso}</p><p className="text-xs text-muted-foreground">kg</p></div>}
                    {e.imc && <div><p className="text-lg font-bold text-slate-700">{e.imc}</p><p className="text-xs text-muted-foreground">IMC</p></div>}
                    {e.percentual_gordura && <div><p className="text-lg font-bold text-amber-600">{e.percentual_gordura}%</p><p className="text-xs text-muted-foreground">Gordura</p></div>}
                    {e.massa_muscular && <div><p className="text-lg font-bold text-blue-600">{e.massa_muscular}kg</p><p className="text-xs text-muted-foreground">Musc.</p></div>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDietaFromEvolucao(e)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                      title="Montar dieta com estes dados"
                    ><UtensilsCrossed className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
              {(e.circunferencia_abdominal || e.circunferencia_quadril || e.circunferencia_braco || e.circunferencia_coxa) && (
                <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-border">
                  {e.circunferencia_abdominal && <span className="text-xs text-muted-foreground">Abdom: {e.circunferencia_abdominal}cm</span>}
                  {e.circunferencia_quadril && <span className="text-xs text-muted-foreground">Quadril: {e.circunferencia_quadril}cm</span>}
                  {e.circunferencia_braco && <span className="text-xs text-muted-foreground">Braço: {e.circunferencia_braco}cm</span>}
                  {e.circunferencia_coxa && <span className="text-xs text-muted-foreground">Coxa: {e.circunferencia_coxa}cm</span>}
                </div>
              )}
              {e.observacoes && <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{e.observacoes}</p>}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum registro encontrado.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Registro' : 'Novo Registro de Evolução'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Paciente *</Label>
                <Select value={form.patient_id} onValueChange={handlePatient}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({...f, data: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Peso (kg)</Label><Input type="number" step="0.1" value={form.peso} onChange={e => setForm(f => ({...f, peso: e.target.value}))} onBlur={calcIMC} /></div>
              <div><Label>Altura (cm)</Label><Input type="number" value={form.altura} onChange={e => setForm(f => ({...f, altura: e.target.value}))} onBlur={calcIMC} /></div>
              <div><Label>IMC</Label><Input type="number" step="0.1" value={form.imc} onChange={e => setForm(f => ({...f, imc: e.target.value}))} placeholder="Auto" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>% Gordura</Label><Input type="number" step="0.1" value={form.percentual_gordura} onChange={e => setForm(f => ({...f, percentual_gordura: e.target.value}))} /></div>
              <div><Label>Massa Muscular (kg)</Label><Input type="number" step="0.1" value={form.massa_muscular} onChange={e => setForm(f => ({...f, massa_muscular: e.target.value}))} /></div>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-1">Circunferências (cm)</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Abdominal</Label><Input type="number" step="0.1" value={form.circunferencia_abdominal} onChange={e => setForm(f => ({...f, circunferencia_abdominal: e.target.value}))} /></div>
              <div><Label>Quadril</Label><Input type="number" step="0.1" value={form.circunferencia_quadril} onChange={e => setForm(f => ({...f, circunferencia_quadril: e.target.value}))} /></div>
              <div><Label>Braço</Label><Input type="number" step="0.1" value={form.circunferencia_braco} onChange={e => setForm(f => ({...f, circunferencia_braco: e.target.value}))} /></div>
              <div><Label>Coxa</Label><Input type="number" step="0.1" value={form.circunferencia_coxa} onChange={e => setForm(f => ({...f, circunferencia_coxa: e.target.value}))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={2} /></div>
            <Button onClick={handleSave} disabled={!form.patient_id || !form.data || isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Registrar Evolução'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este registro?</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => remove.mutate(deleteId)} disabled={remove.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">{remove.isPending ? 'Excluindo...' : 'Excluir'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Montar Dieta a partir da Evolução */}
      <Dialog open={!!dietaFromEvolucao} onOpenChange={() => setDietaFromEvolucao(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-emerald-600" />Montar Dieta</DialogTitle></DialogHeader>
          {dietaFromEvolucao && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Criar um plano alimentar para <strong>{dietaFromEvolucao.patient_nome}</strong> usando os dados mais recentes:</p>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
                {dietaFromEvolucao.peso && <div className="flex justify-between"><span className="text-muted-foreground">Peso:</span><span className="font-semibold">{dietaFromEvolucao.peso} kg</span></div>}
                {dietaFromEvolucao.altura && <div className="flex justify-between"><span className="text-muted-foreground">Altura:</span><span className="font-semibold">{dietaFromEvolucao.altura} cm</span></div>}
                {dietaFromEvolucao.imc && <div className="flex justify-between"><span className="text-muted-foreground">IMC:</span><span className="font-semibold">{dietaFromEvolucao.imc}</span></div>}
                {dietaFromEvolucao.percentual_gordura && <div className="flex justify-between"><span className="text-muted-foreground">% Gordura:</span><span className="font-semibold">{dietaFromEvolucao.percentual_gordura}%</span></div>}
                {dietaFromEvolucao.massa_muscular && <div className="flex justify-between"><span className="text-muted-foreground">Massa Muscular:</span><span className="font-semibold">{dietaFromEvolucao.massa_muscular} kg</span></div>}
              </div>
              <p className="text-xs text-muted-foreground">Você será redirecionado para a tela de Dietas com o paciente pré-selecionado.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDietaFromEvolucao(null)} className="flex-1">Cancelar</Button>
                <Button
                  onClick={() => {
                    navigate(`/dietas?patient_id=${dietaFromEvolucao.patient_id}&patient_nome=${encodeURIComponent(dietaFromEvolucao.patient_nome)}&peso=${dietaFromEvolucao.peso || ''}&altura=${dietaFromEvolucao.altura || ''}&imc=${dietaFromEvolucao.imc || ''}`);
                    setDietaFromEvolucao(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Ir para Dietas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
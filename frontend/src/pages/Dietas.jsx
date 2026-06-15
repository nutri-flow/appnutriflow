import db from '@/api/customClient';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { UtensilsCrossed, Flame, Beef, Wheat, Droplets, Plus, Trash2, Pencil, ChevronDown, ChevronUp, X, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { exportDietaPDF } from '@/utils/exportPDF';

const EMPTY = { patient_id: '', patient_nome: '', nome: '', objetivo: '', calorias_total: '', proteinas_total: '', carboidratos_total: '', lipidios_total: '', fibras_total: '', observacoes: '', refeicoes: [] };

export default function Dietas() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  // Recebe dados da tela de Evolução via URL params
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('patient_id');
    if (pid) {
      const pnome = params.get('patient_nome') || '';
      const peso = params.get('peso') || '';
      const altura = params.get('altura') || '';
      const imc = params.get('imc') || '';
      const obs = [
        peso && `Peso atual: ${peso} kg`,
        altura && `Altura: ${altura} cm`,
        imc && `IMC: ${imc}`,
      ].filter(Boolean).join(' | ');
      setForm(f => ({ ...f, patient_id: pid, patient_nome: pnome, observacoes: obs }));
      setOpen(true);
      // Limpa URL params
      window.history.replaceState({}, '', '/dietas');
    }
  }, []);

  const { data: diets = [], isLoading } = useQuery({ queryKey: ['diets'], queryFn: () => db.entities.Diet.list() });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => db.entities.Patient.list() });

  const create = useMutation({ mutationFn: d => db.entities.Diet.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['diets'] }); closeForm(); } });
  const update = useMutation({ mutationFn: ({ id, d }) => db.entities.Diet.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['diets'] }); closeForm(); } });
  const remove = useMutation({ mutationFn: id => db.entities.Diet.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['diets'] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ patient_id: d.patient_id||'', patient_nome: d.patient_nome||'', nome: d.nome||'', objetivo: d.objetivo||'', calorias_total: d.calorias_total||'', proteinas_total: d.proteinas_total||'', carboidratos_total: d.carboidratos_total||'', lipidios_total: d.lipidios_total||'', fibras_total: d.fibras_total||'', observacoes: d.observacoes||'', refeicoes: d.refeicoes||[] }); setOpen(true); };
  const closeForm = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const handlePatient = (pid) => {
    const p = patients.find(x => x.id === pid);
    setForm(f => ({ ...f, patient_id: pid, patient_nome: p?.nome || '' }));
  };

  const addRefeicao = () => setForm(f => ({ ...f, refeicoes: [...f.refeicoes, { nome: '', horario: '', alimentos: [] }] }));
  const removeRefeicao = (i) => setForm(f => ({ ...f, refeicoes: f.refeicoes.filter((_, idx) => idx !== i) }));
  const updateRefeicao = (i, field, val) => setForm(f => ({ ...f, refeicoes: f.refeicoes.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }));
  const addAlimento = (i) => setForm(f => ({ ...f, refeicoes: f.refeicoes.map((r, idx) => idx === i ? { ...r, alimentos: [...r.alimentos, { nome: '', quantidade: '', medida: '', calorias: '', proteinas: '', carboidratos: '', lipidios: '' }] } : r) }));
  const removeAlimento = (ri, ai) => setForm(f => ({ ...f, refeicoes: f.refeicoes.map((r, idx) => idx === ri ? { ...r, alimentos: r.alimentos.filter((_, aidx) => aidx !== ai) } : r) }));
  const updateAlimento = (ri, ai, field, val) => setForm(f => ({ ...f, refeicoes: f.refeicoes.map((r, ridx) => ridx === ri ? { ...r, alimentos: r.alimentos.map((a, aidx) => aidx === ai ? { ...a, [field]: val } : a) } : r) }));

  const handleSave = () => {
    const payload = { ...form, calorias_total: form.calorias_total ? Number(form.calorias_total) : undefined, proteinas_total: form.proteinas_total ? Number(form.proteinas_total) : undefined, carboidratos_total: form.carboidratos_total ? Number(form.carboidratos_total) : undefined, lipidios_total: form.lipidios_total ? Number(form.lipidios_total) : undefined, fibras_total: form.fibras_total ? Number(form.fibras_total) : undefined };
    editing ? update.mutate({ id: editing.id, d: payload }) : create.mutate(payload);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><UtensilsCrossed className="w-6 h-6 text-emerald-600" />Dietas</h1>
          <p className="text-muted-foreground text-sm">{diets.length} planos alimentares</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />Nova Dieta</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div> : (
        <div className="grid gap-4 md:grid-cols-2">
          {diets.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{d.nome}</h3>
                  <p className="text-sm text-muted-foreground">{d.patient_nome}</p>
                  {d.objetivo && <p className="text-xs text-slate-500 mt-0.5">{d.objetivo}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => exportDietaPDF(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Exportar PDF"><FileDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Kcal', value: d.calorias_total, icon: Flame, color: 'text-orange-500 bg-orange-50' },
                  { label: 'PTN', value: d.proteinas_total ? `${d.proteinas_total}g` : '—', icon: Beef, color: 'text-red-500 bg-red-50' },
                  { label: 'CHO', value: d.carboidratos_total ? `${d.carboidratos_total}g` : '—', icon: Wheat, color: 'text-amber-500 bg-amber-50' },
                  { label: 'LIP', value: d.lipidios_total ? `${d.lipidios_total}g` : '—', icon: Droplets, color: 'text-blue-500 bg-blue-50' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl p-2 ${item.color} text-center`}>
                    <item.icon className="w-3.5 h-3.5 mx-auto mb-0.5" />
                    <p className="text-xs font-bold">{item.value || '—'}</p>
                    <p className="text-xs opacity-70">{item.label}</p>
                  </div>
                ))}
              </div>
              {d.refeicoes?.length > 0 && (
                <div>
                  <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                    {expanded === d.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {d.refeicoes.length} refeições
                  </button>
                  {expanded === d.id && (
                    <div className="mt-2 space-y-2">
                      {d.refeicoes.map((r, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs font-semibold text-slate-700">{r.nome} {r.horario && `• ${r.horario}`}</p>
                          {r.alimentos?.map((a, ai) => (
                            <p key={ai} className="text-xs text-muted-foreground ml-2">• {a.nome} {a.quantidade && `${a.quantidade} ${a.medida || ''}`}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {diets.length === 0 && <p className="text-center text-muted-foreground py-12 col-span-2">Nenhum plano alimentar cadastrado.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Dieta' : 'Nova Dieta'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Paciente *</Label>
                <Select value={form.patient_id} onValueChange={handlePatient}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nome do Plano *</Label><Input value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} placeholder="Ex: Dieta Hipocalórica" /></div>
            </div>
            <div><Label>Objetivo</Label><Input value={form.objetivo} onChange={e => setForm(f => ({...f, objetivo: e.target.value}))} placeholder="Emagrecimento, Hipertrofia..." /></div>
            <div className="grid grid-cols-5 gap-2">
              <div><Label>Kcal</Label><Input type="number" value={form.calorias_total} onChange={e => setForm(f => ({...f, calorias_total: e.target.value}))} /></div>
              <div><Label>PTN (g)</Label><Input type="number" value={form.proteinas_total} onChange={e => setForm(f => ({...f, proteinas_total: e.target.value}))} /></div>
              <div><Label>CHO (g)</Label><Input type="number" value={form.carboidratos_total} onChange={e => setForm(f => ({...f, carboidratos_total: e.target.value}))} /></div>
              <div><Label>LIP (g)</Label><Input type="number" value={form.lipidios_total} onChange={e => setForm(f => ({...f, lipidios_total: e.target.value}))} /></div>
              <div><Label>Fibras (g)</Label><Input type="number" value={form.fibras_total} onChange={e => setForm(f => ({...f, fibras_total: e.target.value}))} /></div>
            </div>

            {/* Refeições */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Refeições</Label>
                <Button type="button" size="sm" variant="outline" onClick={addRefeicao}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
              </div>
              <div className="space-y-3">
                {form.refeicoes.map((r, ri) => (
                  <div key={ri} className="border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input className="flex-1" placeholder="Nome (ex: Café da manhã)" value={r.nome} onChange={e => updateRefeicao(ri, 'nome', e.target.value)} />
                      <Input className="w-28" placeholder="Horário" value={r.horario} onChange={e => updateRefeicao(ri, 'horario', e.target.value)} />
                      <button onClick={() => removeRefeicao(ri)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-1.5 ml-2">
                      {r.alimentos?.map((a, ai) => (
                        <div key={ai} className="flex items-center gap-1.5 flex-wrap">
                          <Input className="flex-1 min-w-32 h-8 text-xs" placeholder="Alimento" value={a.nome} onChange={e => updateAlimento(ri, ai, 'nome', e.target.value)} />
                          <Input className="w-16 h-8 text-xs" placeholder="Qtd" value={a.quantidade} onChange={e => updateAlimento(ri, ai, 'quantidade', e.target.value)} />
                          <Input className="w-20 h-8 text-xs" placeholder="Medida" value={a.medida} onChange={e => updateAlimento(ri, ai, 'medida', e.target.value)} />
                          <Input className="w-16 h-8 text-xs" placeholder="Kcal" value={a.calorias} onChange={e => updateAlimento(ri, ai, 'calorias', e.target.value)} />
                          <button onClick={() => removeAlimento(ri, ai)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      <button onClick={() => addAlimento(ri)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Adicionar alimento</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={2} /></div>
            <Button onClick={handleSave} disabled={!form.patient_id || !form.nome || isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Plano Alimentar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este plano alimentar?</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => remove.mutate(deleteId)} disabled={remove.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">{remove.isPending ? 'Excluindo...' : 'Excluir'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
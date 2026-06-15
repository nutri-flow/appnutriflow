import db from '@/api/customClient';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Calendar, Clock, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, isToday, isFuture, isPast, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const statusColors = { 'Agendada': 'border-l-blue-400', 'Realizada': 'border-l-green-400', 'Cancelada': 'border-l-red-400', 'Remarcada': 'border-l-amber-400' };
const statusBg = { 'Agendada': 'bg-blue-500', 'Realizada': 'bg-green-500', 'Cancelada': 'bg-red-500', 'Remarcada': 'bg-amber-500' };
const EMPTY = { patient_id: '', data: '', tipo: 'Retorno', status: 'Agendada', observacoes: '', valor: '' };

export default function Agenda() {
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: consultations = [], isLoading } = useQuery({ queryKey: ['consultations'], queryFn: () => db.entities.Consultation.list() });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => db.entities.Patient.list() });

  const create = useMutation({ mutationFn: d => db.entities.Consultation.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['consultations'] }); closeForm(); } });
  const update = useMutation({ mutationFn: ({ id, d }) => db.entities.Consultation.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['consultations'] }); closeForm(); } });
  const remove = useMutation({ mutationFn: id => db.entities.Consultation.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['consultations'] }); setDeleteId(null); } });

  const openNew = (day = null) => {
    setEditing(null);
    const dateStr = day ? `${format(day, 'yyyy-MM-dd')}T09:00` : '';
    setForm({ ...EMPTY, data: dateStr });
    setOpen(true);
  };
  const openEdit = (c) => { setEditing(c); setForm({ patient_id: c.patient_id||'', data: c.data ? new Date(c.data).toISOString().slice(0,16) : '', tipo: c.tipo||'Retorno', status: c.status||'Agendada', observacoes: c.observacoes||'', valor: c.valor||'' }); setOpen(true); };
  const closeForm = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const handleSave = () => {
    const payload = { ...form, valor: form.valor ? Number(form.valor) : undefined };
    editing ? update.mutate({ id: editing.id, d: payload }) : create.mutate(payload);
  };

  const patientMap = Object.fromEntries(patients.map(p => [p.id, p.nome]));
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  const getConsultasForDay = (day) => consultations.filter(c => c.data && isSameDay(new Date(c.data), day));
  const selectedDayConsultas = selectedDay ? getConsultasForDay(selectedDay).sort((a, b) => new Date(a.data) - new Date(b.data)) : [];

  const upcoming = consultations.filter(c => c.data && (isToday(new Date(c.data)) || isFuture(new Date(c.data)))).sort((a, b) => new Date(a.data) - new Date(b.data)).slice(0, 5);

  const isPending = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-6 h-6 text-emerald-600" />Agenda</h1>
          <p className="text-muted-foreground text-sm">{upcoming.length} próximas consultas</p>
        </div>
        <Button onClick={() => openNew()} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />Nova Consulta</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 capitalize">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-2 py-1 text-xs rounded-lg hover:bg-slate-100 font-medium">Hoje</button>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const dayConsultas = getConsultasForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isCurrentDay = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  onDoubleClick={() => openNew(day)}
                  className={cn(
                    "relative rounded-xl p-1.5 min-h-[52px] text-left transition-all hover:bg-slate-50 border",
                    isSelected ? 'bg-emerald-50 border-emerald-300' : 'border-transparent',
                    isCurrentDay ? 'border-emerald-400' : ''
                  )}
                >
                  <span className={cn("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isCurrentDay ? 'bg-emerald-600 text-white' : 'text-slate-700'
                  )}>{format(day, 'd')}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayConsultas.slice(0, 2).map(c => (
                      <div key={c.id} className={cn("text-xs px-1 py-0.5 rounded text-white truncate", statusBg[c.status] || 'bg-slate-500')}>
                        {patientMap[c.patient_id]?.split(' ')[0] || '?'}
                      </div>
                    ))}
                    {dayConsultas.length > 2 && <p className="text-xs text-muted-foreground">+{dayConsultas.length - 2}</p>}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-slate-700 capitalize">{format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}</h3>
                <button onClick={() => openNew(selectedDay)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Agendar</button>
              </div>
              {selectedDayConsultas.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma consulta neste dia</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayConsultas.map(c => (
                    <div key={c.id} className={cn("flex items-center justify-between p-2.5 rounded-xl border-l-4 bg-slate-50", statusColors[c.status] || 'border-l-slate-300')}>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{patientMap[c.patient_id] || 'Paciente'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{c.data ? format(new Date(c.data), 'HH:mm') : ''} • {c.tipo}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="p-1 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-900">Próximas Consultas</h2>
          {isLoading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div> : (
            <>
              {upcoming.map(c => (
                <div key={c.id} className={cn("bg-white rounded-xl border-l-4 border border-border p-3 shadow-sm", statusColors[c.status] || 'border-l-slate-300')}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{patientMap[c.patient_id] || 'Paciente'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{c.data ? format(new Date(c.data), "EEE, d MMM • HH:mm", { locale: ptBR }) : ''}</p>
                      <p className="text-xs text-muted-foreground">{c.tipo}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isToday(new Date(c.data)) && <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Hoje</span>}
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="p-1 text-slate-400 hover:text-slate-700"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {upcoming.length === 0 && <div className="bg-white rounded-2xl border border-border p-8 text-center"><p className="text-muted-foreground text-sm">Nenhuma consulta agendada</p></div>}
            </>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Agendada">Agendada</SelectItem><SelectItem value="Realizada">Realizada</SelectItem><SelectItem value="Cancelada">Cancelada</SelectItem><SelectItem value="Remarcada">Remarcada</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm(f => ({...f, valor: e.target.value}))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={2} /></div>
            <Button onClick={handleSave} disabled={!form.patient_id || !form.data || isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Agendar Consulta'}
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
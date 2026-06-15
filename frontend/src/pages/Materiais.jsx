import db from '@/api/customClient';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { BookOpen, Star, Plus, Pencil, Trash2, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const catColors = { 'Receita': 'bg-orange-100 text-orange-700', 'Guia': 'bg-blue-100 text-blue-700', 'Protocolo': 'bg-violet-100 text-violet-700', 'Material Educativo': 'bg-green-100 text-green-700', 'PDF': 'bg-red-100 text-red-700', 'Orientação': 'bg-amber-100 text-amber-700', 'Outro': 'bg-slate-100 text-slate-600' };
const categorias = ['Receita','Guia','Protocolo','Material Educativo','PDF','Orientação','Outro'];
const EMPTY = { titulo: '', categoria: 'Guia', conteudo: '', descricao: '', tags: [], favorito: false, arquivo_url: '' };

export default function Materiais() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);
  const [tagInput, setTagInput] = useState('');

  const { data: materials = [], isLoading } = useQuery({ queryKey: ['materials'], queryFn: () => db.entities.Material.list() });

  const create = useMutation({ mutationFn: d => db.entities.Material.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); closeForm(); } });
  const update = useMutation({ mutationFn: ({ id, d }) => db.entities.Material.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); closeForm(); } });
  const remove = useMutation({ mutationFn: id => db.entities.Material.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); setDeleteId(null); } });
  const toggleFav = (m) => update.mutate({ id: m.id, d: { favorito: !m.favorito } });

  const openNew = () => { setEditing(null); setForm(EMPTY); setTagInput(''); setOpen(true); };
  const openEdit = (m) => { setEditing(m); setForm({ titulo: m.titulo||'', categoria: m.categoria||'Guia', conteudo: m.conteudo||'', descricao: m.descricao||'', tags: m.tags||[], favorito: m.favorito||false, arquivo_url: m.arquivo_url||'' }); setTagInput(''); setOpen(true); };
  const closeForm = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const addTag = () => { if (tagInput.trim()) { setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] })); setTagInput(''); } };
  const removeTag = (i) => setForm(f => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }));
  const handleSave = () => editing ? update.mutate({ id: editing.id, d: form }) : create.mutate(form);
  const isPending = create.isPending || update.isPending;

  const filtered = materials.filter(m => m.titulo?.toLowerCase().includes(search.toLowerCase()) || m.categoria?.toLowerCase().includes(search.toLowerCase()) || m.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-6 h-6 text-emerald-600" />Materiais</h1>
          <p className="text-muted-foreground text-sm">{materials.length} materiais disponíveis</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />Novo Material</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar materiais..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div> : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setViewing(m)}>
              <div className="flex items-start justify-between mb-2">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", catColors[m.categoria] || 'bg-slate-100 text-slate-600')}>{m.categoria}</span>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleFav(m)} className="p-1 hover:scale-110 transition-transform">
                    <Star className={cn("w-4 h-4", m.favorito ? 'text-amber-400 fill-amber-400' : 'text-slate-300')} />
                  </button>
                  <button onClick={() => openEdit(m)} className="p-1 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(m.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900">{m.titulo}</h3>
              {m.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.descricao}</p>}
              <div className="flex flex-wrap gap-1 mt-3">
                {m.tags?.slice(0,3).map(tag => <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{tag}</span>)}
                {m.arquivo_url && <span className="text-xs text-blue-600 flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" />Arquivo</span>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12 col-span-3">Nenhum material encontrado.</p>}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.titulo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", catColors[viewing?.categoria] || 'bg-slate-100')}>{viewing?.categoria}</span>
              {viewing?.tags?.map(tag => <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{tag}</span>)}
            </div>
            {viewing?.descricao && <p className="text-sm text-muted-foreground">{viewing.descricao}</p>}
            {viewing?.arquivo_url && <a href={viewing.arquivo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline"><ExternalLink className="w-4 h-4" />Abrir arquivo</a>}
            {viewing?.conteudo && <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap border border-border">{viewing.conteudo}</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Material' : 'Novo Material'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={e => setForm(f => ({...f, titulo: e.target.value}))} placeholder="Título do material" /></div>
            <div><Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({...f, categoria: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} placeholder="Breve descrição" /></div>
            <div><Label>URL do Arquivo (opcional)</Label><Input value={form.arquivo_url} onChange={e => setForm(f => ({...f, arquivo_url: e.target.value}))} placeholder="https://..." /></div>
            <div><Label>Conteúdo</Label><Textarea value={form.conteudo} onChange={e => setForm(f => ({...f, conteudo: e.target.value}))} rows={6} placeholder="Conteúdo do material..." /></div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Adicionar tag..." />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((tag, i) => <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">{tag}<button onClick={() => removeTag(i)} className="text-slate-400 hover:text-red-500">×</button></span>)}
              </div>
            </div>
            <Button onClick={handleSave} disabled={!form.titulo || isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Material'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este material?</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => remove.mutate(deleteId)} disabled={remove.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">{remove.isPending ? 'Excluindo...' : 'Excluir'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
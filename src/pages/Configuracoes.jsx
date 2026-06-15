import { Settings } from 'lucide-react';

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Settings className="w-6 h-6 text-emerald-600" />Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas preferências</p>
      </div>
      <div className="bg-white rounded-2xl border border-border p-8 shadow-sm text-center">
        <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-muted-foreground">Configurações em breve.</p>
      </div>
    </div>
  );
}
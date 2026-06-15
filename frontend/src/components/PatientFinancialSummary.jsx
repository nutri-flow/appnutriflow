import db from '@/api/customClient';
import { useQuery } from '@tanstack/react-query';

import { DollarSign, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors = { 'Pago': 'bg-green-100 text-green-700', 'Pendente': 'bg-amber-100 text-amber-700', 'Cancelado': 'bg-red-100 text-red-600' };
const statusIcons = { 'Pago': CheckCircle2, 'Pendente': Clock, 'Cancelado': XCircle };

export default function PatientFinancialSummary({ patientId }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['financials', patientId],
    queryFn: () => db.entities.FinancialRecord.filter({ patient_id: patientId }, '-created_date'),
    enabled: !!patientId,
  });

  if (isLoading) return <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" /></div>;
  if (records.length === 0) return <p className="text-xs text-muted-foreground text-center py-3">Nenhum lançamento financeiro.</p>;

  const totalPago = records.filter(r => r.status === 'Pago').reduce((s, r) => s + (r.valor || 0), 0);
  const totalPendente = records.filter(r => r.status === 'Pendente').reduce((s, r) => s + (r.valor || 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-xs text-emerald-700 font-medium">Recebido</p>
          <p className="text-base font-bold text-emerald-700">R${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-xs text-amber-700 font-medium">Pendente</p>
          <p className="text-base font-bold text-amber-700">R${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {records.map(r => {
          const Icon = statusIcons[r.status] || Clock;
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-border last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", r.status === 'Pago' ? 'text-green-500' : r.status === 'Pendente' ? 'text-amber-500' : 'text-red-500')} />
                <span className="truncate text-slate-700">{r.descricao || 'Consulta'}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.data_vencimento && <span className="text-muted-foreground">{format(parseISO(r.data_vencimento), 'dd/MM/yy')}</span>}
                <span className="font-semibold text-slate-900">R${(r.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className={cn("px-1.5 py-0.5 rounded-full font-medium", statusColors[r.status])}>{r.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
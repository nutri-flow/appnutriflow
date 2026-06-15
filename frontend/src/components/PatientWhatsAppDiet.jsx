import db from '@/api/customClient';
import { useQuery } from '@tanstack/react-query';

import { Send, FileText, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PatientWhatsAppDiet({ patient }) {
  const phone = (patient.whatsapp || patient.telefone || '').replace(/\D/g, '');
  const phoneIntl = phone.startsWith('55') ? phone : `55${phone}`;

  const { data: diets = [], isLoading } = useQuery({
    queryKey: ['diets', patient.id],
    queryFn: () => db.entities.Diet.filter({ patient_id: patient.id }, '-created_date'),
    enabled: !!patient.id,
  });

  const sendWhatsApp = (diet) => {
    const refeicoes = (diet.refeicoes || []).map(r => {
      const alimentos = (r.alimentos || []).map(a => `  - ${a.nome} ${a.quantidade ? `(${a.quantidade} ${a.medida || ''})` : ''}`).join('\n');
      return `*${r.nome}${r.horario ? ` - ${r.horario}` : ''}*\n${alimentos}`;
    }).join('\n\n');

    const msg = [
      `Olá, ${patient.nome.split(' ')[0]}! 👋`,
      `Segue seu plano alimentar: *${diet.nome}*`,
      diet.objetivo ? `🎯 Objetivo: ${diet.objetivo}` : '',
      diet.calorias_total ? `🔥 Total: ${diet.calorias_total} kcal` : '',
      '',
      refeicoes,
      diet.observacoes ? `\n📝 Observações:\n${diet.observacoes}` : '',
      '\nQualquer dúvida, estou à disposição! 🥗',
    ].filter(l => l !== undefined).join('\n');

    const url = `https://wa.me/${phoneIntl}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (!phone) {
    return <p className="text-xs text-muted-foreground text-center py-2">Nenhum número de telefone cadastrado.</p>;
  }

  if (isLoading) {
    return <div className="flex justify-center py-3"><div className="w-5 h-5 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <MessageCircle className="w-3.5 h-3.5 text-green-600" />
        <span className="text-xs font-semibold text-slate-700">Enviar Dieta via WhatsApp</span>
        <span className="text-xs text-muted-foreground ml-auto">{phoneIntl}</span>
      </div>

      {diets.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum plano alimentar cadastrado para este paciente.</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {diets.map(diet => (
            <button
              key={diet.id}
              onClick={() => sendWhatsApp(diet)}
              className="w-full flex items-center justify-between gap-2 text-xs bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl px-3 py-2 transition-all group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="truncate font-medium text-slate-800">{diet.nome}</span>
                {diet.calorias_total && <span className="text-muted-foreground flex-shrink-0">{diet.calorias_total} kcal</span>}
              </div>
              <div className="flex items-center gap-1 text-green-600 flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                <Send className="w-3 h-3" />
                <span className="font-medium">Enviar</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
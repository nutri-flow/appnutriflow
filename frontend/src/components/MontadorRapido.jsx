import { useState } from 'react';
import { Zap, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const BLOCOS = {
  'Orientações Gerais': [
    { label: 'Hidratação', texto: '💧 Hidratação: Beba pelo menos 2 litros de água por dia, distribuídos ao longo do dia. Prefira água pura e evite bebidas açucaradas.' },
    { label: 'Mastigação', texto: '🍽️ Mastigação: Mastigue bem os alimentos (cerca de 20-30 vezes por garfada). Coma devagar, sem pressa, e em ambiente tranquilo.' },
    { label: 'Horários', texto: '⏰ Respeite os horários das refeições. Não fique mais de 3-4 horas sem se alimentar. Evite pular refeições.' },
    { label: 'Sono', texto: '😴 Sono: Durma pelo menos 7-8 horas por noite. O sono adequado é fundamental para o metabolismo e controle do peso.' },
  ],
  'Substituições Alimentares': [
    { label: 'Substituições Proteínas', texto: '🔄 Substituições de Proteínas:\n• Frango → Peixe, Peru, Ovo, Tofu\n• Carne vermelha → Frango, Peixe\n• Iogurte grego → Queijo cottage, Ricota' },
    { label: 'Substituições Carboidratos', texto: '🔄 Substituições de Carboidratos:\n• Arroz branco → Arroz integral, Quinoa, Batata-doce\n• Pão branco → Pão integral, Tapioca, Beiju\n• Macarrão → Macarrão integral, Abobrinha em tiras' },
    { label: 'Substituições Lanches', texto: '🔄 Substituições Saudáveis para Lanches:\n• Biscoito → Castanhas, Frutas, Iogurte\n• Suco de caixinha → Água com limão, Chá gelado sem açúcar\n• Chocolate → Chocolate amargo 70% ou mais' },
  ],
  'Hábitos Saudáveis': [
    { label: 'Atividade Física', texto: '🏃 Atividade Física: Pratique pelo menos 150 minutos de atividade física moderada por semana. Combine exercícios aeróbicos com musculação.' },
    { label: 'Planejamento Semanal', texto: '📋 Planejamento Alimentar: Reserve um momento da semana para planejar suas refeições. Faça a lista de compras com antecedência e deixe marmitas prontas.' },
    { label: 'Leitura de Rótulos', texto: '🏷️ Leitura de Rótulos: Ao comprar alimentos industrializados, verifique:\n• Quantidade de açúcar (menor que 5g/porção)\n• Sódio (menor que 400mg/porção)\n• Lista de ingredientes (ingredientes naturais primeiro)' },
    { label: 'Mindful Eating', texto: '🧘 Alimentação Consciente: Silencie o celular durante as refeições. Foque no sabor, textura e aroma dos alimentos. Coma sentado e sem distrações.' },
  ],
  'Orientações Específicas': [
    { label: 'Pré-treino', texto: '💪 Alimentação Pré-treino (1-2h antes):\n• Carboidrato de fácil digestão + proteína leve\n• Exemplos: Banana com pasta de amendoim, Iogurte com granola, Pão integral com frango' },
    { label: 'Pós-treino', texto: '🏋️ Alimentação Pós-treino (até 1h após):\n• Proteína de rápida absorção + carboidrato\n• Exemplos: Whey + banana, Frango com batata-doce, Omelete com arroz' },
    { label: 'Refeição Livre', texto: '🎉 Refeição Livre: Você tem direito a 1 refeição livre por semana. Aproveite sem culpa, mas com moderação. Não use como desculpa para excessos por dias seguidos.' },
  ],
};

export default function MontadorRapido({ onInserir }) {
  const [aberto, setAberto] = useState(false);
  const [categoriaAberta, setCategoriaAberta] = useState(null);

  return (
    <div className="border border-emerald-200 rounded-xl bg-emerald-50/50">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-emerald-800"
      >
        <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-600" />Montagem Rápida</span>
        {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {aberto && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground">Clique em um bloco para inserir nas observações.</p>
          {Object.entries(BLOCOS).map(([categoria, blocos]) => (
            <div key={categoria}>
              <button
                onClick={() => setCategoriaAberta(categoriaAberta === categoria ? null : categoria)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 py-1.5 border-b border-border"
              >
                <span>{categoria}</span>
                {categoriaAberta === categoria ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {categoriaAberta === categoria && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {blocos.map(b => (
                    <button
                      key={b.label}
                      onClick={() => onInserir(b.texto)}
                      className="flex items-center gap-1 text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-all"
                    >
                      <Plus className="w-2.5 h-2.5" />{b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
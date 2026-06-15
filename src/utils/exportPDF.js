import jsPDF from 'jspdf';

function addHeader(doc, title, subtitle, pageWidth) {
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('NutriFlow', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 21);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth - 14, 21, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);
  return 36;
}

function addSection(doc, label, y, pageWidth) {
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(label, 16, y + 1);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

function checkNewPage(doc, y, needed = 10) {
  if (y > 270) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function exportDietaPDF(dieta) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = addHeader(doc, `Plano Alimentar: ${dieta.nome}`, dieta.patient_nome, pageWidth);

  // Info block
  if (dieta.objetivo) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Objetivo: ${dieta.objetivo}`, 14, y);
    y += 7;
  }

  // Macros
  const macros = [
    { label: 'Calorias', value: dieta.calorias_total ? `${dieta.calorias_total} kcal` : '—' },
    { label: 'Proteínas', value: dieta.proteinas_total ? `${dieta.proteinas_total}g` : '—' },
    { label: 'Carboidratos', value: dieta.carboidratos_total ? `${dieta.carboidratos_total}g` : '—' },
    { label: 'Lipídios', value: dieta.lipidios_total ? `${dieta.lipidios_total}g` : '—' },
    { label: 'Fibras', value: dieta.fibras_total ? `${dieta.fibras_total}g` : '—' },
  ];

  const boxW = (pageWidth - 28) / macros.length;
  macros.forEach((m, i) => {
    const x = 14 + i * boxW;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(x, y, boxW - 2, 14, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + (boxW - 2) / 2, y + 5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(m.value, x + (boxW - 2) / 2, y + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
  });
  y += 22;

  // Refeições
  if (dieta.refeicoes?.length > 0) {
    y = addSection(doc, 'REFEIÇÕES', y, pageWidth);
    dieta.refeicoes.forEach((r, ri) => {
      y = checkNewPage(doc, y, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const refeicaoLabel = `${ri + 1}. ${r.nome}${r.horario ? `  (${r.horario})` : ''}`;
      doc.text(refeicaoLabel, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y += 6;

      if (r.alimentos?.length > 0) {
        // Table header
        doc.setFillColor(248, 250, 252);
        doc.rect(16, y - 3, pageWidth - 32, 6, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Alimento', 18, y + 1);
        doc.text('Qtd/Medida', pageWidth - 60, y + 1);
        doc.text('Kcal', pageWidth - 20, y + 1, { align: 'right' });
        y += 7;

        r.alimentos.forEach(a => {
          y = checkNewPage(doc, y);
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(`• ${a.nome}`, 18, y);
          if (a.quantidade) doc.text(`${a.quantidade} ${a.medida || ''}`, pageWidth - 60, y);
          if (a.calorias) doc.text(`${a.calorias}`, pageWidth - 20, y, { align: 'right' });
          y += 5.5;
        });
      }
      y += 4;
    });
  }

  // Observações
  if (dieta.observacoes) {
    y = checkNewPage(doc, y, 20);
    y = addSection(doc, 'OBSERVAÇÕES', y, pageWidth);
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(dieta.observacoes, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5;
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado pelo NutriFlow • Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
  }

  doc.save(`Dieta_${dieta.patient_nome?.replace(/\s/g, '_') || 'paciente'}_${dieta.nome?.replace(/\s/g, '_')}.pdf`);
}

export function exportTemplatePDF(template) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = addHeader(doc, `Protocolo: ${template.nome}`, template.categoria, pageWidth);

  if (template.descricao) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const lines = doc.splitTextToSize(template.descricao, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 6;
  }

  // Tags
  if (template.tags?.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tags: ${template.tags.join(', ')}`, 14, y);
    y += 8;
  }

  if (template.conteudo) {
    y = addSection(doc, 'CONTEÚDO', y, pageWidth);
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(template.conteudo, pageWidth - 28);
    lines.forEach(line => {
      y = checkNewPage(doc, y);
      doc.text(line, 14, y);
      y += 5.5;
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado pelo NutriFlow • Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
  }

  doc.save(`Protocolo_${template.nome?.replace(/\s/g, '_')}.pdf`);
}
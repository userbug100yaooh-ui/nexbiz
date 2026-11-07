// Geração de PDF no navegador (jsPDF + autotable), com cabeçalho NEXBIZ navy.

import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import type { UserOptions } from "jspdf-autotable";

// Registra doc.autoTable() no protótipo — interop estável com o bundler do Vite.
applyPlugin(jsPDF);
type DocWithTable = jsPDF & { autoTable: (options: UserOptions) => void; lastAutoTable: { finalY: number } };

export interface PdfSection {
  title: string;
  head: string[];
  rows: (string | number)[][];
  /** índices de colunas alinhadas à direita (valores) */
  rightAlign?: number[];
}

export interface PdfReport {
  title: string;
  subtitle?: string;
  companyName: string;
  summary?: [string, string][];
  sections: PdfSection[];
  filename: string;
}

const NAVY: [number, number, number] = [11, 19, 43];
const BLUE: [number, number, number] = [37, 99, 235];

export function exportPdf(report: PdfReport): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 72, "F");
  doc.setFillColor(...BLUE);
  doc.roundedRect(40, 20, 32, 32, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("N", 51, 42);
  doc.text("NEXBIZ", 82, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(report.companyName, 82, 50);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth - 40, 42, { align: "right" });

  // Título
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.title, 40, 106);
  let y = 122;
  if (report.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(report.subtitle, 40, y);
    y += 14;
  }

  // Resumo em blocos
  if (report.summary?.length) {
    const gap = 10;
    const cols = Math.min(report.summary.length, 4);
    const w = (pageWidth - 80 - gap * (cols - 1)) / cols;
    report.summary.forEach(([label, value], i) => {
      const x = 40 + (i % cols) * (w + gap);
      const rowY = y + 8 + Math.floor(i / cols) * 58;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, rowY, w, 48, 6, 6, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label, x + 10, rowY + 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...NAVY);
      doc.text(value, x + 10, rowY + 36);
    });
    y += 8 + Math.ceil(report.summary.length / cols) * 58 + 10;
  }

  // Seções em tabela
  for (const section of report.sections) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(section.title, 40, y + 14);
    const columnStyles: Record<number, { halign: "right" }> = {};
    (section.rightAlign ?? []).forEach((i) => (columnStyles[i] = { halign: "right" }));
    (doc as DocWithTable).autoTable({
      startY: y + 22,
      head: [section.head],
      body: section.rows.map((r) => r.map(String)),
      margin: { left: 40, right: 40 },
      styles: { fontSize: 8.5, cellPadding: 5, textColor: [15, 23, 42] },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles,
    });
    y = (doc as DocWithTable).lastAutoTable.finalY + 18;
  }

  // Rodapé com paginação
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const h = doc.internal.pageSize.getHeight();
    doc.text("NEXBIZ · Gestão Empresarial — documento gerado automaticamente", 40, h - 24);
    doc.text(`Página ${i} de ${pages}`, pageWidth - 40, h - 24, { align: "right" });
  }

  doc.save(report.filename);
}

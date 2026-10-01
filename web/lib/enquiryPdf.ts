import { PDFPage } from 'pdf-lib';
import { formatINR, formatQty } from './format';
import {
  A4,
  MARGIN,
  PDF_COLORS,
  PdfFonts,
  createDoc,
  drawHairline,
  fitText,
  todayLabel,
} from './pdf';
import type { PriceUnit } from './types';

export interface EnquiryPdfLine {
  name: string;
  sku: string;
  qty: number;
  unit: PriceUnit;
  unit_price: number;
  subtotal: number;
}

export interface EnquiryPdfInput {
  business_name: string;
  advisor_name: string;
  whatsapp_number: string;
  customer_name: string;
  customer_phone: string;
  notes: string;
  lines: EnquiryPdfLine[];
  total: number;
}

const COL = { item: MARGIN, qty: 330, price: 410, subtotal: 500 };
const ROW_H = 22;

function drawTableHeader(page: PDFPage, fonts: PdfFonts, y: number): void {
  const { bold } = fonts;
  page.drawText('ITEM', { x: COL.item, y, size: 9, font: bold, color: PDF_COLORS.muted });
  page.drawText('QTY', { x: COL.qty, y, size: 9, font: bold, color: PDF_COLORS.muted });
  page.drawText('UNIT PRICE', { x: COL.price, y, size: 9, font: bold, color: PDF_COLORS.muted });
  page.drawText('SUBTOTAL', { x: COL.subtotal, y, size: 9, font: bold, color: PDF_COLORS.muted });
}

function drawLineRow(page: PDFPage, fonts: PdfFonts, line: EnquiryPdfLine, y: number): void {
  const { regular } = fonts;
  const name = fitText(line.name, regular, 10, COL.qty - COL.item - 8);
  page.drawText(name, { x: COL.item, y, size: 10, font: regular, color: PDF_COLORS.ink });
  page.drawText(fitText(line.sku, regular, 8, 60), {
    x: COL.item,
    y: y - 12,
    size: 8,
    font: regular,
    color: PDF_COLORS.faint,
  });
  page.drawText(formatQty(line.qty, line.unit), {
    x: COL.qty,
    y,
    size: 10,
    font: regular,
    color: PDF_COLORS.ink,
  });
  page.drawText(formatINR(line.unit_price), {
    x: COL.price,
    y,
    size: 10,
    font: regular,
    color: PDF_COLORS.ink,
  });
  page.drawText(formatINR(line.subtotal), {
    x: COL.subtotal,
    y,
    size: 10,
    font: regular,
    color: PDF_COLORS.ink,
  });
}

export async function generateEnquiryPdf(input: EnquiryPdfInput): Promise<Uint8Array> {
  const { doc, fonts } = await createDoc();
  const { regular, bold } = fonts;
  let page = doc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;

  page.drawText(input.business_name.toUpperCase(), {
    x: MARGIN,
    y,
    size: 11,
    font: bold,
    color: PDF_COLORS.primary,
  });
  y -= 26;
  page.drawText('Enquiry Summary', { x: MARGIN, y, size: 22, font: bold, color: PDF_COLORS.ink });
  y -= 18;
  page.drawText(`Generated ${todayLabel()}`, {
    x: MARGIN,
    y,
    size: 10,
    font: regular,
    color: PDF_COLORS.muted,
  });
  y -= 26;
  drawHairline(page, MARGIN, y, A4.width - MARGIN);
  y -= 22;

  page.drawText('Customer', { x: MARGIN, y, size: 9, font: bold, color: PDF_COLORS.muted });
  y -= 16;
  page.drawText(input.customer_name || '—', { x: MARGIN, y, size: 11, font: regular, color: PDF_COLORS.ink });
  y -= 16;
  page.drawText(input.customer_phone || '—', {
    x: MARGIN,
    y,
    size: 11,
    font: regular,
    color: PDF_COLORS.ink,
  });
  y -= 26;
  drawHairline(page, MARGIN, y, A4.width - MARGIN);
  y -= 22;

  const ensureSpace = (needed: number): void => {
    if (y - needed < MARGIN + 60) {
      page = doc.addPage([A4.width, A4.height]);
      y = A4.height - MARGIN;
    }
  };

  drawTableHeader(page, fonts, y);
  y -= 8;
  drawHairline(page, MARGIN, y, A4.width - MARGIN);
  y -= ROW_H;

  for (const line of input.lines) {
    ensureSpace(ROW_H + 40);
    drawLineRow(page, fonts, line, y);
    y -= ROW_H + 6;
    drawHairline(page, MARGIN, y + 4, A4.width - MARGIN);
  }

  y -= 10;
  ensureSpace(60);
  page.drawText('Estimated Total', { x: COL.price, y, size: 11, font: bold, color: PDF_COLORS.ink });
  const totalText = formatINR(input.total);
  const totalW = bold.widthOfTextAtSize(totalText, 14);
  page.drawText(totalText, {
    x: A4.width - MARGIN - totalW,
    y,
    size: 14,
    font: bold,
    color: PDF_COLORS.primary,
  });
  y -= 14;
  page.drawText('Taxes & freight calculated on confirmation.', {
    x: COL.price,
    y,
    size: 8,
    font: regular,
    color: PDF_COLORS.faint,
  });
  y -= 30;

  if (input.notes.trim()) {
    ensureSpace(80);
    page.drawText('Custom Instructions & Specifications', {
      x: MARGIN,
      y,
      size: 10,
      font: bold,
      color: PDF_COLORS.ink,
    });
    y -= 16;
    const words = input.notes.trim().split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, 10) > A4.width - MARGIN * 2) {
        page.drawText(current, { x: MARGIN, y, size: 10, font: regular, color: PDF_COLORS.muted });
        y -= 15;
        ensureSpace(40);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) {
      page.drawText(current, { x: MARGIN, y, size: 10, font: regular, color: PDF_COLORS.muted });
      y -= 15;
    }
    y -= 16;
  }

  drawHairline(page, MARGIN, y, A4.width - MARGIN);
  y -= 18;
  page.drawText(
    `Concierge: ${input.advisor_name} • WhatsApp ${input.whatsapp_number}`,
    { x: MARGIN, y, size: 9, font: regular, color: PDF_COLORS.muted },
  );

  return doc.save();
}

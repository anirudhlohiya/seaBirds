import { PDFPage, degrees } from 'pdf-lib';
import { formatINR, formatUnitPrice } from './format';
import {
  A4,
  EmbeddedPhoto,
  MARGIN,
  PDF_COLORS,
  PdfFonts,
  createDoc,
  drawHairline,
  drawPhotoPlaceholder,
  fitText,
  resolvePhoto,
  todayLabel,
  wrapText,
} from './pdf';
import type { Category, Product, StoreSettings } from './types';

export interface CataloguePdfOptions {
  scope: 'master' | 'category' | 'new-arrivals';
  categorySlug?: string;
  includeTiers: boolean;
  includeSpecs: boolean;
  includeContact: boolean;
  recipientName?: string;
}

export interface CataloguePdfInput {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  options: CataloguePdfOptions;
}

interface Tier {
  label: string;
  price: number;
}

function bulkTiers(price: number): Tier[] {
  return [
    { label: 'Retail', price },
    { label: '10+ pcs', price: Math.round(price * 0.95) },
    { label: '50+ pcs', price: Math.round(price * 0.9) },
  ];
}

function catalogueTitle(input: CataloguePdfInput): { title: string; volume: string } {
  const year = new Date().getFullYear();
  const { scope, categorySlug } = input.options;
  if (scope === 'new-arrivals') return { title: 'New Arrivals Lookbook', volume: `${year} Edition` };
  if (scope === 'category' && categorySlug) {
    const cat = input.categories.find((c) => c.slug === categorySlug);
    if (cat) return { title: cat.name, volume: `Curated ${year}` };
  }
  return { title: 'Master Catalogue', volume: `Complete Collection ${year}` };
}

function drawCover(
  page: PDFPage,
  fonts: PdfFonts,
  input: CataloguePdfInput,
  title: string,
  volume: string,
): void {
  const { regular, bold } = fonts;
  const { settings, options } = input;
  const cx = A4.width / 2;

  const brand = settings.business_name.toUpperCase();
  const brandW = bold.widthOfTextAtSize(brand, 13);
  page.drawText(brand, { x: cx - brandW / 2, y: A4.height - 180, size: 13, font: bold, color: PDF_COLORS.primary });

  const titleLines = wrapText(title, bold, 34, A4.width - MARGIN * 2 - 40);
  titleLines.forEach((line, i) => {
    const w = bold.widthOfTextAtSize(line, 34);
    page.drawText(line, { x: cx - w / 2, y: A4.height - 260 - i * 42, size: 34, font: bold, color: PDF_COLORS.ink });
  });
  const volY = A4.height - 260 - titleLines.length * 42;
  const volW = regular.widthOfTextAtSize(volume, 14);
  page.drawText(volume, { x: cx - volW / 2, y: volY, size: 14, font: regular, color: PDF_COLORS.accent });

  const date = todayLabel();
  const dateW = regular.widthOfTextAtSize(date, 11);
  page.drawText(date, { x: cx - dateW / 2, y: volY - 36, size: 11, font: regular, color: PDF_COLORS.muted });

  const count = `${input.products.length} curated textile${input.products.length === 1 ? '' : 's'}`;
  const countW = regular.widthOfTextAtSize(count, 11);
  page.drawText(count, { x: cx - countW / 2, y: volY - 58, size: 11, font: regular, color: PDF_COLORS.muted });

  if (options.recipientName?.trim()) {
    const label = `Prepared for ${options.recipientName.trim()}`;
    const labelW = regular.widthOfTextAtSize(label, 12);
    page.drawText(label, { x: cx - labelW / 2, y: volY - 92, size: 12, font: regular, color: PDF_COLORS.primary });
    const wm = fitText(options.recipientName.trim().toUpperCase(), bold, 44, A4.width - 80);
    page.drawText(wm, {
      x: 60,
      y: 200,
      size: 44,
      font: bold,
      color: PDF_COLORS.accent,
      opacity: 0.07,
      rotate: degrees(30),
    });
  }
}

function drawSpecs(
  page: PDFPage,
  fonts: PdfFonts,
  product: Product,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const { regular, bold } = fonts;
  const rows: [string, string][] = [
    ['Fabric', product.fabric_composition],
    ['Weave', product.weave],
    ['Dimensions', product.dimensions],
  ];
  let cursor = y;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x, y: cursor, size: 7.5, font: bold, color: PDF_COLORS.faint });
    const lines = wrapText(value, regular, 8.5, maxWidth - 76).slice(0, 2);
    lines.forEach((line, i) => {
      page.drawText(line, { x: x + 76, y: cursor - i * 11, size: 8.5, font: regular, color: PDF_COLORS.muted });
    });
    cursor -= Math.max(14, lines.length * 11 + 3);
  }
  return cursor;
}

function drawTierTable(
  page: PDFPage,
  fonts: PdfFonts,
  product: Product,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const { regular, bold } = fonts;
  page.drawText('BULK TIERS', { x, y, size: 7.5, font: bold, color: PDF_COLORS.faint });
  let cursor = y - 14;
  for (const tier of bulkTiers(product.price)) {
    page.drawText(tier.label, { x, y: cursor, size: 8.5, font: regular, color: PDF_COLORS.muted });
    const priceText = formatINR(tier.price);
    const pw = regular.widthOfTextAtSize(priceText, 8.5);
    page.drawText(priceText, { x: x + maxWidth - pw, y: cursor, size: 8.5, font: regular, color: PDF_COLORS.ink });
    cursor -= 13;
  }
  return cursor;
}

interface CardPhoto {
  photo: EmbeddedPhoto | null;
  label: string;
}

function drawProductCard(
  page: PDFPage,
  fonts: PdfFonts,
  product: Product,
  card: CardPhoto,
  options: CataloguePdfOptions,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const { regular, bold } = fonts;
  const pad = 14;
  const imgW = w * 0.36;
  const imgH = h - pad * 2;
  const imgX = x + pad;
  const imgY = y - h + pad;

  if (card.photo) {
    card.photo.drawOn(page, imgX, imgY, imgW, imgH);
  } else {
    drawPhotoPlaceholder(page, fonts, imgX, imgY, imgW, imgH, card.label);
  }

  const tx = imgX + imgW + 18;
  const tw = x + w - pad - tx;
  let cursor = y - pad - 4;

  const nameLines = wrapText(product.name, bold, 14, tw).slice(0, 2);
  nameLines.forEach((line) => {
    page.drawText(line, { x: tx, y: cursor, size: 14, font: bold, color: PDF_COLORS.ink });
    cursor -= 18;
  });
  cursor -= 2;
  page.drawText(fitText(`SKU ${product.sku}`, regular, 8.5, tw), {
    x: tx,
    y: cursor,
    size: 8.5,
    font: regular,
    color: PDF_COLORS.faint,
  });
  cursor -= 16;
  page.drawText(fitText(product.yarn_label.toUpperCase(), bold, 8, tw), {
    x: tx,
    y: cursor,
    size: 8,
    font: bold,
    color: PDF_COLORS.accent,
  });
  cursor -= 18;

  if (options.includeSpecs) {
    cursor = drawSpecs(page, fonts, product, tx, cursor, tw);
    cursor -= 10;
  }

  page.drawText(formatUnitPrice(product.price, product.unit), {
    x: tx,
    y: cursor,
    size: 13,
    font: bold,
    color: PDF_COLORS.primary,
  });
  cursor -= 20;

  if (options.includeTiers) {
    cursor = drawTierTable(page, fonts, product, tx, cursor, tw);
  }
}

function drawFooter(
  page: PDFPage,
  fonts: PdfFonts,
  pageNum: number,
  totalPages: number,
  settings: StoreSettings,
  includeContact: boolean,
): void {
  const { regular } = fonts;
  const label = `Page ${pageNum} of ${totalPages}`;
  const lw = regular.widthOfTextAtSize(label, 8);
  page.drawText(label, {
    x: A4.width - MARGIN - lw,
    y: MARGIN - 18,
    size: 8,
    font: regular,
    color: PDF_COLORS.faint,
  });
  if (includeContact) {
    const contact = `${settings.business_name} • WhatsApp ${settings.whatsapp_number} • ${settings.address}`;
    page.drawText(fitText(contact, regular, 8, A4.width - MARGIN * 2 - 90), {
      x: MARGIN,
      y: MARGIN - 18,
      size: 8,
      font: regular,
      color: PDF_COLORS.faint,
    });
  }
}

export async function generateCataloguePdf(input: CataloguePdfInput): Promise<Uint8Array> {
  const { doc, fonts } = await createDoc();
  const { options, settings } = input;
  const { title, volume } = catalogueTitle(input);

  const cover = doc.addPage([A4.width, A4.height]);
  drawCover(cover, fonts, input, title, volume);

  const photos: CardPhoto[] = await Promise.all(
    input.products.map(async (p) => ({
      photo: p.images[0] ? await resolvePhoto(doc, p.images[0].url) : null,
      label: p.sku,
    })),
  );

  const footerH = 34;
  const usableH = A4.height - MARGIN * 2 - footerH;
  const cardH = usableH / 2 - 8;
  const cardW = A4.width - MARGIN * 2;
  const productPages: PDFPage[] = [];

  for (let i = 0; i < input.products.length; i += 2) {
    const page = doc.addPage([A4.width, A4.height]);
    productPages.push(page);
    const topY = A4.height - MARGIN;
    for (let k = 0; k < 2; k++) {
      const idx = i + k;
      if (idx >= input.products.length) break;
      const y = topY - k * (cardH + 16);
      page.drawRectangle({
        x: MARGIN,
        y: y - cardH,
        width: cardW,
        height: cardH,
        borderColor: PDF_COLORS.hairline,
        borderWidth: 1,
      });
      drawProductCard(page, fonts, input.products[idx], photos[idx], options, MARGIN, y, cardW, cardH);
    }
    drawHairline(page, MARGIN, MARGIN, A4.width - MARGIN);
  }

  const totalPages = productPages.length + 1;
  productPages.forEach((page, i) => {
    drawFooter(page, fonts, i + 2, totalPages, settings, options.includeContact);
  });

  return doc.save();
}

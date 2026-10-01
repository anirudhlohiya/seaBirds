import { PDFPage } from 'pdf-lib';
import { formatUnitPrice } from './format';
import {
  A4,
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
import type { PriceUnit } from './types';

export interface WishlistPdfProduct {
  name: string;
  sku: string;
  price: number;
  unit: PriceUnit;
  image_url: string;
  yarn_label: string;
}

export interface WishlistPdfInput {
  business_name: string;
  products: WishlistPdfProduct[];
}

const ROW_H = 132;
const PHOTO_W = 88;

function drawCover(page: PDFPage, fonts: PdfFonts, businessName: string, count: number): void {
  const { regular, bold } = fonts;
  const cx = A4.width / 2;
  const title = 'My Curated Wishlist';
  const titleW = bold.widthOfTextAtSize(title, 30);
  page.drawText(title, { x: cx - titleW / 2, y: A4.height - 300, size: 30, font: bold, color: PDF_COLORS.ink });
  const sub = `${businessName} • ${count} saved textile${count === 1 ? '' : 's'}`;
  const subW = regular.widthOfTextAtSize(sub, 12);
  page.drawText(sub, { x: cx - subW / 2, y: A4.height - 340, size: 12, font: regular, color: PDF_COLORS.muted });
  const date = todayLabel();
  const dateW = regular.widthOfTextAtSize(date, 11);
  page.drawText(date, { x: cx - dateW / 2, y: A4.height - 366, size: 11, font: regular, color: PDF_COLORS.faint });
  const brand = businessName.toUpperCase();
  const brandW = bold.widthOfTextAtSize(brand, 13);
  page.drawText(brand, { x: cx - brandW / 2, y: 120, size: 13, font: bold, color: PDF_COLORS.primary });
}

async function drawProductRow(
  doc: Parameters<typeof resolvePhoto>[0],
  page: PDFPage,
  fonts: PdfFonts,
  product: WishlistPdfProduct,
  y: number,
): Promise<void> {
  const { regular, bold } = fonts;
  const photoH = ROW_H - 24;
  const photoY = y - photoH;

  const photo = await resolvePhoto(doc, product.image_url);
  if (photo) {
    photo.drawOn(page, MARGIN, photoY, PHOTO_W, photoH);
  } else {
    drawPhotoPlaceholder(page, fonts, MARGIN, photoY, PHOTO_W, photoH, product.sku);
  }

  const textX = MARGIN + PHOTO_W + 20;
  const textW = A4.width - MARGIN - textX;
  page.drawText(fitText(product.name, bold, 13, textW), {
    x: textX,
    y: y - 20,
    size: 13,
    font: bold,
    color: PDF_COLORS.ink,
  });
  page.drawText(fitText(product.sku, regular, 9, textW), {
    x: textX,
    y: y - 36,
    size: 9,
    font: regular,
    color: PDF_COLORS.faint,
  });
  const yarnLines = wrapText(product.yarn_label, regular, 10, textW).slice(0, 2);
  yarnLines.forEach((line, i) => {
    page.drawText(line, { x: textX, y: y - 52 - i * 14, size: 10, font: regular, color: PDF_COLORS.muted });
  });
  page.drawText(formatUnitPrice(product.price, product.unit), {
    x: textX,
    y: y - 52 - yarnLines.length * 14 - 4,
    size: 12,
    font: bold,
    color: PDF_COLORS.primary,
  });
  drawHairline(page, MARGIN, y - ROW_H + 4, A4.width - MARGIN);
}

export async function generateWishlistPdf(input: WishlistPdfInput): Promise<Uint8Array> {
  const { doc, fonts } = await createDoc();

  const cover = doc.addPage([A4.width, A4.height]);
  drawCover(cover, fonts, input.business_name, input.products.length);

  let page = doc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;

  for (const product of input.products) {
    if (y - ROW_H < MARGIN) {
      page = doc.addPage([A4.width, A4.height]);
      y = A4.height - MARGIN;
    }
    await drawProductRow(doc, page, fonts, product, y);
    y -= ROW_H;
  }

  return doc.save();
}

/** Slugify a string for a download filename. */
export function slugFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

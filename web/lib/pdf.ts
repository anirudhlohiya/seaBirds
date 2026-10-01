import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';

export const PDF_COLORS = {
  primary: rgb(0x00 / 255, 0x43 / 255, 0x57 / 255),
  accent: rgb(0x0d / 255, 0x5c / 255, 0x75 / 255),
  accentWash: rgb(0xe6 / 255, 0xf4 / 255, 0xf7 / 255),
  ink: rgb(0x14 / 255, 0x1b / 255, 0x2b / 255),
  muted: rgb(0x40 / 255, 0x48 / 255, 0x4c / 255),
  faint: rgb(0x9c / 255, 0xa3 / 255, 0xaf / 255),
  hairline: rgb(0xe5 / 255, 0xe7 / 255, 0xeb / 255),
  white: rgb(1, 1, 1),
};

export const A4 = { width: 595.28, height: 841.89 };
export const MARGIN = 48;

export interface PdfFonts {
  regular: PDFFont;
  bold: PDFFont;
}

export async function createDoc(): Promise<{ doc: PDFDocument; fonts: PdfFonts }> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, fonts: { regular, bold } };
}

/** Truncate text with an ellipsis so it fits maxWidth. */
export function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && font.widthOfTextAtSize(`${trimmed}…`, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

/** Wrap text into lines that fit maxWidth. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = fitText(word, font, size, maxWidth);
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function drawHairline(
  page: PDFPage,
  x1: number,
  y: number,
  x2: number,
): void {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness: 0.75,
    color: PDF_COLORS.hairline,
  });
}

/** Fetch a remote image and return raw bytes, or null on any failure. */
export async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return null;
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  );
}

/** Embed JPG/PNG bytes on the doc; returns null for anything else (e.g. SVG). Never throws. */
export async function embedPhoto(
  doc: PDFDocument,
  bytes: Uint8Array,
): Promise<{ image: { width: number; height: number }; draw: EmbeddedPhoto['drawOn'] } | null> {
  try {
    const image = isPng(bytes) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    return {
      image: { width: image.width, height: image.height },
      draw: (page, x, y, w, h) => {
        page.drawImage(image, { x, y, width: w, height: h });
      },
    };
  } catch {
    return null;
  }
}

export interface EmbeddedPhoto {
  width: number;
  height: number;
  drawOn: (page: PDFPage, x: number, y: number, w: number, h: number) => void;
}

/** Resolve a product image URL to a drawable photo, or null when unavailable. Never throws. */
export async function resolvePhoto(doc: PDFDocument, url: string): Promise<EmbeddedPhoto | null> {
  try {
    const absolute = new URL(url, window.location.origin).toString();
    const bytes = await fetchImageBytes(absolute);
    if (!bytes) return null;
    const embedded = await embedPhoto(doc, bytes);
    if (!embedded) return null;
    return {
      width: embedded.image.width,
      height: embedded.image.height,
      drawOn: embedded.draw,
    };
  } catch {
    return null;
  }
}

/** Draw a labelled placeholder box where a photo could not be embedded. */
export function drawPhotoPlaceholder(
  page: PDFPage,
  fonts: PdfFonts,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
): void {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: PDF_COLORS.accentWash,
    borderColor: PDF_COLORS.hairline,
    borderWidth: 1,
  });
  const text = fitText(label, fonts.regular, 8, w - 16);
  const tw = fonts.regular.widthOfTextAtSize(text, 8);
  page.drawText(text, {
    x: x + (w - tw) / 2,
    y: y + h / 2 - 4,
    size: 8,
    font: fonts.regular,
    color: PDF_COLORS.muted,
  });
}

/** Trigger a browser download of generated PDF bytes. */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

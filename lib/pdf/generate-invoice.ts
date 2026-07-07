import fs from "fs";
import path from "path";

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import type { ReactElement } from "react";

import { downloadBrandingLogo } from "@/lib/storage/branding";

import { InvoiceDocument } from "./invoice-document";

const PAID_STAMP_PATH = path.join(
  process.cwd(),
  "lib",
  "pdf",
  "assets",
  "paid-stamp-watermark.png",
);

export type InvoicePaymentType = "ONE_TIME" | "INSTALLMENT";

export type InvoiceLineItem = {
  description: string;
  amount: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  paymentDate: string;
  paymentType: InvoicePaymentType;
  method: string;
  reference: string | null;
  notes: string | null;
  recordedByName: string;
  amount: number;
  paidThisReceipt: number;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentAddress: string;
  installmentLabel: string | null;
  batchCode: string | null;
  /** @deprecated Use lines — kept for email fallback */
  lineDescription: string;
  lines: InvoiceLineItem[];
  academyName: string;
  academyAddress: string | null;
  academyPhone: string | null;
  academyEmail: string | null;
  academyLogoUrl: string | null;
  currency: string;
  invoiceFooter: string | null;
  invoiceTerms: string | null;
  paymentMethodLabel: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankBranch: string | null;
};

const logoDataUriCache = new Map<string, string>();
let cachedPaidStampSrc: string | null | undefined;

function toDataUri(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function getPaidStampSrc(): string | null {
  if (cachedPaidStampSrc !== undefined) return cachedPaidStampSrc;
  try {
    if (!fs.existsSync(PAID_STAMP_PATH)) {
      cachedPaidStampSrc = null;
      return null;
    }
    const buffer = fs.readFileSync(PAID_STAMP_PATH);
    cachedPaidStampSrc = toDataUri(buffer, "image/png");
    return cachedPaidStampSrc;
  } catch {
    cachedPaidStampSrc = null;
    return null;
  }
}

async function getLogoSrc(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;

  const cached = logoDataUriCache.get(logoUrl);
  if (cached) return cached;

  const fetched = await downloadBrandingLogo(logoUrl);
  if (!fetched) return null;

  const src = toDataUri(fetched.buffer, fetched.mime);
  logoDataUriCache.set(logoUrl, src);
  return src;
}

export function clearInvoiceLogoCache(): void {
  logoDataUriCache.clear();
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const [logoSrc, paidStampSrc] = await Promise.all([
    getLogoSrc(data.academyLogoUrl),
    Promise.resolve(getPaidStampSrc()),
  ]);

  const element = React.createElement(InvoiceDocument, {
    data,
    logoSrc,
    paidStampSrc,
  }) as ReactElement;

  const buffer = await renderToBuffer(
    element as Parameters<typeof renderToBuffer>[0],
  );
  return Buffer.from(buffer);
}

import { buildInvoicePayload } from "@/lib/pdf/build-invoice-payload";
import { computeInvoiceContentHash } from "@/lib/pdf/invoice-content-hash";
import {
  normalizeInvoicePdfUploadStatus,
  type InvoicePdfUploadStatus,
} from "@/lib/pdf/invoice-pdf-status";
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice";
import { prisma } from "@/lib/prisma";
import {
  downloadInvoicePdf as downloadCachedInvoicePdf,
  uploadInvoicePdf,
} from "@/lib/storage/invoice-pdf";
import { invoicePdfProxyUrl } from "@/lib/storage/proxy-urls";

export type InvoicePdfMeta = {
  invoiceId: string;
  invoiceNumber: string;
  contentHash: string;
  uploadStatus: InvoicePdfUploadStatus;
  pdfUrl: string | null;
  uploadError: string | null;
  isStale: boolean;
};

export type ServeInvoicePdfResult = {
  pdfBuffer: Buffer;
  meta: InvoicePdfMeta;
  servedFromCache: boolean;
};

async function tryUploadAndPersist(
  invoiceId: string,
  contentHash: string,
  pdfBuffer: Buffer,
): Promise<{ uploadStatus: InvoicePdfUploadStatus; pdfUrl: string | null; uploadError: string | null }> {
  try {
    const storagePath = await uploadInvoicePdf(invoiceId, pdfBuffer);
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        pdfUrl: storagePath,
        pdfContentHash: contentHash,
        pdfUploadStatus: "READY",
        pdfUploadError: null,
        generatedAt: new Date(),
      },
    });
    return { uploadStatus: "READY", pdfUrl: storagePath, uploadError: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        pdfContentHash: contentHash,
        pdfUploadStatus: "FAILED",
        pdfUploadError: message,
        generatedAt: new Date(),
      },
    });
    return { uploadStatus: "FAILED", pdfUrl: null, uploadError: message };
  }
}

/**
 * Returns invoice PDF bytes. Uses storage cache when content hash matches;
 * regenerates when stale. Upload runs synchronously (with auto-retry on GET).
 */
export async function serveInvoicePdf(
  paymentId: string,
  opts?: { forceRegenerate?: boolean; uploadOnly?: boolean },
): Promise<ServeInvoicePdfResult | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      voidedAt: true,
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          pdfUrl: true,
          pdfContentHash: true,
          pdfUploadStatus: true,
          pdfUploadError: true,
        },
      },
    },
  });

  if (!payment?.invoice) return null;
  if (payment.voidedAt) {
    throw new Error("VOIDED");
  }

  const invoice = payment.invoice;
  const payload = await buildInvoicePayload(paymentId);
  if (!payload) return null;

  const contentHash = computeInvoiceContentHash(payload);
  const storedHash = invoice.pdfContentHash;
  const isStale = storedHash !== contentHash;
  const uploadStatus = normalizeInvoicePdfUploadStatus(invoice.pdfUploadStatus);

  let pdfBuffer: Buffer | null = null;
  let servedFromCache = false;

  if (!opts?.forceRegenerate && !isStale && uploadStatus === "READY") {
    pdfBuffer = await downloadCachedInvoicePdf(invoice.id);
    if (pdfBuffer) {
      servedFromCache = true;
    }
  }

  if (!pdfBuffer && !opts?.uploadOnly) {
    pdfBuffer = await generateInvoicePdf(payload);
    servedFromCache = false;
  }

  if (!pdfBuffer) {
    pdfBuffer = await downloadCachedInvoicePdf(invoice.id);
    if (!pdfBuffer) {
      pdfBuffer = await generateInvoicePdf(payload);
      servedFromCache = false;
    } else {
      servedFromCache = true;
    }
  }

  let meta: InvoicePdfMeta = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    contentHash,
    uploadStatus,
    pdfUrl: invoicePdfProxyUrl(paymentId, invoice.pdfUrl),
    uploadError: invoice.pdfUploadError,
    isStale,
  };

  const needsUpload =
    isStale ||
    uploadStatus !== "READY" ||
    !invoice.pdfUrl ||
    opts?.forceRegenerate;

  if (needsUpload && pdfBuffer) {
    const upload = await tryUploadAndPersist(invoice.id, contentHash, pdfBuffer);
    meta = {
      ...meta,
      uploadStatus: upload.uploadStatus,
      pdfUrl: invoicePdfProxyUrl(paymentId, upload.pdfUrl),
      uploadError: upload.uploadError,
      isStale: false,
    };
  }

  return { pdfBuffer, meta, servedFromCache };
}

export async function getInvoicePdfMeta(
  paymentId: string,
): Promise<InvoicePdfMeta | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      voidedAt: true,
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          pdfUrl: true,
          pdfContentHash: true,
          pdfUploadStatus: true,
          pdfUploadError: true,
        },
      },
    },
  });

  if (!payment?.invoice || payment.voidedAt) return null;

  const payload = await buildInvoicePayload(paymentId);
  if (!payload) return null;

  const contentHash = computeInvoiceContentHash(payload);
  const isStale = payment.invoice.pdfContentHash !== contentHash;

  return {
    invoiceId: payment.invoice.id,
    invoiceNumber: payment.invoice.invoiceNumber,
    contentHash,
    uploadStatus: normalizeInvoicePdfUploadStatus(payment.invoice.pdfUploadStatus),
    pdfUrl: invoicePdfProxyUrl(paymentId, payment.invoice.pdfUrl),
    uploadError: payment.invoice.pdfUploadError,
    isStale,
  };
}

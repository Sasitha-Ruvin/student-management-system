import { Prisma, type PrismaClient } from "@/app/generated/prisma";

type InvoiceNumberClient = PrismaClient | Prisma.TransactionClient;

function parseInvoiceSequence(invoiceNumber: string, yearPrefix: string): number | null {
  if (!invoiceNumber.startsWith(yearPrefix)) return null;
  const suffix = invoiceNumber.slice(yearPrefix.length);
  const parsed = Number.parseInt(suffix, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function maxInvoiceSequence(
  client: InvoiceNumberClient,
  yearPrefix: string,
): Promise<number> {
  const invoices = await client.invoice.findMany({
    where: { invoiceNumber: { startsWith: yearPrefix } },
    select: { invoiceNumber: true },
  });

  let max = 0;
  for (const { invoiceNumber } of invoices) {
    const seq = parseInvoiceSequence(invoiceNumber, yearPrefix);
    if (seq !== null && seq > max) {
      max = seq;
    }
  }
  return max;
}

/**
 * Generates the next sequential invoice number within a transaction.
 * Format: {prefix}-{YYYY}-{NNNN} e.g. "INV-2026-0001"
 *
 * Uses the highest numeric sequence for the current year prefix (not
 * generatedAt, which can tie and return the wrong row).
 */
export async function nextInvoiceNumber(
  tx: InvoiceNumberClient,
): Promise<string> {
  const year = new Date().getFullYear();

  const settings = await tx.academySettings.findUnique({
    where: { id: "default" },
    select: { invoiceNumberPrefix: true },
  });
  const prefix = settings?.invoiceNumberPrefix ?? "INV";
  const yearPrefix = `${prefix}-${year}-`;

  const maxSeq = await maxInvoiceSequence(tx, yearPrefix);
  return `${yearPrefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

function isInvoiceNumberConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes("invoiceNumber")
  );
}

type CreateInvoiceInput = {
  studentId: string;
  paymentId: string;
  amount: number;
};

/**
 * Creates an invoice with a unique number, retrying if a concurrent request
 * claimed the same sequence first.
 */
export async function createInvoiceForPayment(
  tx: InvoiceNumberClient,
  data: CreateInvoiceInput,
) {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const invoiceNumber = await nextInvoiceNumber(tx);
    try {
      return await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId: data.studentId,
          paymentId: data.paymentId,
          amount: data.amount,
          pdfUrl: null,
          pdfUploadStatus: "PENDING",
        },
        select: { id: true, invoiceNumber: true, pdfUrl: true },
      });
    } catch (err) {
      if (isInvoiceNumberConflict(err) && attempt < maxAttempts - 1) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to allocate a unique invoice number");
}

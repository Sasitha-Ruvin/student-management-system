import type { TransferSettlementKind, Prisma } from "@/app/generated/prisma";

type Tx = Prisma.TransactionClient;

export type TransferSettlementInput = {
  kind: TransferSettlementKind;
  amount: number;
  notes?: string | null;
};

export async function recordTransferSettlement(
  tx: Tx,
  params: {
    sourceEnrollmentId: string;
    targetEnrollmentId: string | null;
    settlement: TransferSettlementInput;
    recordedById: string;
    appliedAmount?: number;
  },
) {
  const { sourceEnrollmentId, targetEnrollmentId, settlement, recordedById, appliedAmount } =
    params;

  return tx.transferSettlement.create({
    data: {
      sourceEnrollmentId,
      targetEnrollmentId,
      kind: settlement.kind,
      amount: settlement.amount,
      appliedAmount: appliedAmount ?? null,
      notes: settlement.notes?.trim() || null,
      recordedById,
    },
    select: { id: true, kind: true, amount: true, appliedAmount: true },
  });
}

export function buildSettlementEnrollmentNote(
  kind: TransferSettlementKind,
  amount: number,
  sourceBatchCode: string,
  extra?: string | null,
): string {
  const labels: Record<TransferSettlementKind, string> = {
    CREDIT_NOTE: "Transfer credit note",
    APPLY_TO_NEW: "Transfer credit applied to new plan",
    REFUND_RECORD: "Transfer refund recorded",
    MANUAL_ADJUSTMENT: "Transfer — manual plan adjustment",
  };
  const base = `${labels[kind]}: LKR ${amount.toLocaleString()} from ${sourceBatchCode}.`;
  return extra?.trim() ? `${base} ${extra.trim()}` : base;
}

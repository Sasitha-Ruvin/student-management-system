const DEFAULT_DISCLAIMER =
  "Kindly note that all payments made are non-refundable.";

export function formatInvoiceDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day} / ${month} / ${year}`;
}

/** LKR-style amount: `1000/-` or `1500.50/-` */
export function formatInvoiceAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${rounded.toLocaleString("en-LK")}/-`;
  }
  return `${rounded.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/-`;
}

export function resolveInvoiceDisclaimer(terms: string | null): string {
  return terms?.trim() || DEFAULT_DISCLAIMER;
}

export function formatMethodLabel(method: string): string {
  return method.replace(/_/g, " ");
}

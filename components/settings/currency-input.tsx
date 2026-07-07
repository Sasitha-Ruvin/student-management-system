"use client";

type CurrencyInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  currency?: string;
};

export function CurrencyInput({
  id,
  label,
  value,
  onChange,
  currency = "LKR",
}: CurrencyInputProps) {
  const symbol = currency === "LKR" ? "Rs" : currency === "USD" ? "$" : currency;

  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="text-sm text-neutral-700">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-600">
          {symbol}
        </span>
        <input
          id={id}
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-secondary-400 bg-tertiary-100 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-primary-900"
        />
      </div>
    </label>
  );
}

"use client";

export function sanitizeAmount(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  const decimals = rest.join("").slice(0, 2);
  const trimmed = whole.replace(/^0+(?=\d)/, "").slice(0, 6);
  return rest.length ? `${trimmed || "0"}.${decimals}` : trimmed;
}

export function AmountInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const width = Math.max(1, value.length || 1);

  return (
    <label className="flex cursor-text items-start justify-center py-6 text-ink">
      <span className={`mt-2 text-3xl font-semibold ${value ? "text-ink" : "text-muted/50"}`}>$</span>
      <input
        inputMode="decimal"
        autoFocus
        value={value}
        onChange={(e) => onChange(sanitizeAmount(e.target.value))}
        placeholder="0"
        aria-label="Amount"
        className="bg-transparent text-center text-7xl font-semibold tracking-tight tabular-nums outline-none placeholder:text-muted/40"
        style={{ width: `${width}ch` }}
      />
    </label>
  );
}

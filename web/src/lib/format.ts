const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatUsd(value: number | string) {
  return usd.format(Number(value));
}

export function formatFee(feeUsd: number) {
  if (feeUsd === 0) return "$0.00";
  if (feeUsd < 0.0001) return "<$0.0001";
  if (feeUsd < 0.01) return `$${feeUsd.toFixed(4)}`;
  return formatUsd(feeUsd);
}

export function formatSettle(ms: number) {
  return ms < 1000 ? `${(ms / 1000).toFixed(2)}s` : `${(ms / 1000).toFixed(1)}s`;
}

/** Venmo Instant Transfer: 1.75%, min $0.25, max $25 to move money to your bank right away. */
export function venmoInstantFee(amount: number) {
  return Math.min(25, Math.max(0.25, amount * 0.0175));
}

export function timeAgo(timestamp: number) {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

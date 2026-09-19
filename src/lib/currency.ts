export function formatCurrency(amount: number, options?: { compact?: boolean }): string {
  if (options?.compact) {
    if (amount >= 1000000000) return `PKR ${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `PKR ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `PKR ${(amount / 1000).toFixed(0)}k`;
    return `PKR ${amount}`;
  }

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

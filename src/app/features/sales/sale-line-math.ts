/**
 * Pure helpers for sale-line totals.
 *
 * Contract:
 *   - unitPrice already includes tax (PVP final al cliente).
 *   - lineSubtotal = unitPrice * quantity.
 *   - saleTotal = sum of lineSubtotal across all lines.
 *
 * Discounts (per-line and global) are intentionally out of scope until
 * minerva-core expands the Sale aggregate. See memory/project_sales_deferred.md.
 */

export const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

export const lineSubtotal = (unitPrice: number, quantity: number): number => {
  const safePrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
  const safeQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;
  return round2(safePrice * safeQty);
};

export const saleTotal = (
  lines: ReadonlyArray<{ unitPrice: number; quantity: number }>,
): number => {
  const sum = lines.reduce(
    (acc, line) => acc + lineSubtotal(line.unitPrice, line.quantity),
    0,
  );
  return round2(sum);
};

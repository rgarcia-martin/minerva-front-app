/**
 * Pure helpers for the reactive price math used in the purchase line editor.
 *
 * The legacy CMS modelled six fields (buy_price, buy_discount, base_price,
 * profit, pre_sale_price, sale_price) so it could express provider discounts
 * separately from base catalog price. minerva-core collapses that into a
 * single `buyPrice` per purchase line, so the front-end only needs four
 * reactive values:
 *
 *   - basePrice    (what we pay the provider, ex-tax) — editable
 *   - profitMargin (%) — editable
 *   - taxRate      (%) — comes from the chosen tax — editable via dropdown
 *   - salePrice    (final PVP including tax) — editable
 *
 * Invariant kept on every recompute:
 *
 *   salePrice = basePrice * (1 + profitMargin/100) * (1 + taxRate/100)
 *
 * Mirrors the "ben" target from the legacy `component-item.js` so that
 * editing the PVP keeps the base price stable and shifts the margin instead.
 */

const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

export const computeSalePrice = (
  basePrice: number,
  profitMargin: number,
  taxRate: number,
): number => {
  const safeBase = Number.isFinite(basePrice) ? basePrice : 0;
  const safeMargin = Number.isFinite(profitMargin) ? profitMargin : 0;
  const safeTax = Number.isFinite(taxRate) ? taxRate : 0;
  return round2(safeBase * (1 + safeMargin / 100) * (1 + safeTax / 100));
};

export const computeProfitMargin = (
  basePrice: number,
  salePrice: number,
  taxRate: number,
): number => {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  const safeSale = Number.isFinite(salePrice) ? salePrice : 0;
  const safeTax = Number.isFinite(taxRate) ? taxRate : 0;
  const preTaxSale = safeSale / (1 + safeTax / 100);
  return round2((preTaxSale / basePrice - 1) * 100);
};

export const lineTotal = (basePrice: number, quantity: number): number => {
  const safeBase = Number.isFinite(basePrice) ? basePrice : 0;
  const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  return round2(safeBase * safeQty);
};

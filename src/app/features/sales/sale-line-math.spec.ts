import { lineSubtotal, round2, saleTotal } from './sale-line-math';

describe('sale-line-math', () => {
  describe('round2', () => {
    it('rounds to two decimals', () => {
      expect(round2(1.115)).toBe(1.12);
      expect(round2(1.004)).toBe(1.0);
    });

    it('returns 0 for non-finite values', () => {
      expect(round2(Number.NaN)).toBe(0);
      expect(round2(Number.POSITIVE_INFINITY)).toBe(0);
    });
  });

  describe('lineSubtotal', () => {
    it('multiplies price by quantity and rounds', () => {
      expect(lineSubtotal(3.33, 3)).toBe(9.99);
    });

    it('floors fractional quantities', () => {
      expect(lineSubtotal(10, 2.7)).toBe(20);
    });

    it('returns 0 for invalid inputs', () => {
      expect(lineSubtotal(-1, 1)).toBe(0);
      expect(lineSubtotal(1, 0)).toBe(0);
      expect(lineSubtotal(Number.NaN, 2)).toBe(0);
    });
  });

  describe('saleTotal', () => {
    it('sums line subtotals', () => {
      expect(
        saleTotal([
          { unitPrice: 10, quantity: 2 },
          { unitPrice: 5.5, quantity: 1 },
        ]),
      ).toBe(25.5);
    });

    it('returns 0 for empty list', () => {
      expect(saleTotal([])).toBe(0);
    });
  });
});

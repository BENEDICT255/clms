import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/commercial/Money';
import { FinancialInvariantError } from '@/shared/errors/ApplicationError';

describe('Money Value Object', () => {
  it('correctly instantiates from major units and avoids floating point drift', () => {
    const m1 = Money.fromMajor(100.5, 'TZS');
    expect(m1.majorAmount).toBe(100.5);
    expect(m1.currency).toBe('TZS');

    // 0.1 + 0.2 floating point check
    const a = Money.fromMajor(0.1, 'USD');
    const b = Money.fromMajor(0.2, 'USD');
    const sum = a.add(b);
    expect(sum.majorAmount).toBe(0.3);
  });

  it('correctly adds and subtracts monetary values', () => {
    const a = Money.fromMajor(1000, 'TZS');
    const b = Money.fromMajor(400, 'TZS');

    const sum = a.add(b);
    expect(sum.majorAmount).toBe(1400);

    const diff = a.subtract(b);
    expect(diff.majorAmount).toBe(600);
  });

  it('throws FinancialInvariantError when subtraction produces negative amount', () => {
    const a = Money.fromMajor(100, 'TZS');
    const b = Money.fromMajor(200, 'TZS');

    expect(() => a.subtract(b)).toThrow(FinancialInvariantError);
  });

  it('throws FinancialInvariantError when performing arithmetic across different currencies', () => {
    const tzs = Money.fromMajor(1000, 'TZS');
    const usd = Money.fromMajor(10, 'USD');

    expect(() => tzs.add(usd)).toThrow(FinancialInvariantError);
    expect(() => tzs.subtract(usd)).toThrow(FinancialInvariantError);
  });

  it('evaluates greater than and less than or equal correctly', () => {
    const a = Money.fromMajor(100, 'TZS');
    const b = Money.fromMajor(200, 'TZS');
    const c = Money.fromMajor(100, 'TZS');

    expect(b.isGreaterThan(a)).toBe(true);
    expect(a.isGreaterThan(b)).toBe(false);
    expect(a.isLessThanOrEqual(b)).toBe(true);
    expect(a.isLessThanOrEqual(c)).toBe(true);
  });
});

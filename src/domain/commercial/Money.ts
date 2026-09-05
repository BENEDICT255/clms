import { FinancialInvariantError } from '@/shared/errors/ApplicationError';

export type CurrencyCode = 'TZS' | 'USD';

export class Money {
  private readonly amountInMinorUnits: bigint;
  public readonly currency: CurrencyCode;

  private constructor(amountInMinorUnits: bigint, currency: CurrencyCode = 'TZS') {
    this.amountInMinorUnits = amountInMinorUnits;
    this.currency = currency;
  }

  /**
   * Creates a Money instance from standard major units (e.g. 10.50 TZS -> 1050 minor units).
   */
  public static fromMajor(amount: number | string, currency: CurrencyCode = 'TZS'): Money {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) {
      throw new FinancialInvariantError(`Invalid monetary amount: ${amount}`);
    }
    // Minor units factor: 100 for 2 decimal places
    const minor = BigInt(Math.round(numericAmount * 100));
    return new Money(minor, currency);
  }

  public static zero(currency: CurrencyCode = 'TZS'): Money {
    return new Money(0n, currency);
  }

  public get majorAmount(): number {
    return Number(this.amountInMinorUnits) / 100;
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountInMinorUnits + other.amountInMinorUnits, this.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.amountInMinorUnits - other.amountInMinorUnits;
    if (result < 0n) {
      throw new FinancialInvariantError(
        `Monetary subtraction result cannot be negative: ${this.toString()} - ${other.toString()}`
      );
    }
    return new Money(result, this.currency);
  }

  public isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInMinorUnits > other.amountInMinorUnits;
  }

  public isLessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInMinorUnits <= other.amountInMinorUnits;
  }

  public equals(other: Money): boolean {
    return this.currency === other.currency && this.amountInMinorUnits === other.amountInMinorUnits;
  }

  public isZero(): boolean {
    return this.amountInMinorUnits === 0n;
  }

  public toString(): string {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: this.currency === 'TZS' ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(this.majorAmount);
    return `${this.currency} ${formatted}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new FinancialInvariantError(
        `Currency mismatch: Cannot perform financial arithmetic between ${this.currency} and ${other.currency}`
      );
    }
  }
}

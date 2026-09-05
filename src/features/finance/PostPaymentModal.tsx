// ==============================================================================
// CLMS Post Payment Transaction Modal
// ==============================================================================
// Governed by PRODUCT.md Section 29 & 30:
// - Dedicated payment disbursement workflow
// - Authoritative non-overpayment invariant validation (Payment <= Outstanding)
// - Concurrency row-locking server RPC integration
// - Real-time calculation of remaining balance and resulting status
// ==============================================================================

import { useState } from 'react';
import { Modal, Button, Input, Alert, FinancialValue } from '@/design-system';
import { FinanceQueueItem, financeRepository } from '@/infrastructure/repositories/FinanceRepository';
import { FinanceEngine } from '@/domain/finance/FinanceEngine';
import { RefreshCw, CreditCard, ShieldCheck } from 'lucide-react';

interface PostPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FinanceQueueItem | null;
  onSuccess: (paymentResult: { amount: number; outstanding: number; status: string }) => void;
}

export function PostPaymentModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: PostPaymentModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0] ?? ''
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [fundingSource, setFundingSource] = useState('Standard Chartered Operating A/C');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!invoice) return null;

  const enteredAmount = parseFloat(amountStr) || 0;

  // Real-time calculation using FinanceEngine
  const calcResult = FinanceEngine.calculatePayment({
    totalPayable: invoice.totalPayable,
    existingPaid: invoice.cumulativePaid,
    paymentAmount: enteredAmount,
    currency: invoice.currency,
  });

  const handlePostPayment = async () => {
    if (!calcResult.isValid) {
      setError(calcResult.errors[0] ?? 'Please verify disbursement details.');
      return;
    }

    if (!referenceNumber.trim()) {
      setError('External bank / EFT payment voucher reference number is mandatory.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await financeRepository.postPayment({
        invoiceId: invoice.id,
        referenceNumber: referenceNumber.trim(),
        paymentDate,
        amount: enteredAmount,
        fundingSource,
      });

      if (res.success) {
        onSuccess({
          amount: enteredAmount,
          outstanding: res.outstanding ?? calcResult.newOutstandingBalance,
          status: res.status ?? calcResult.resultingStatus,
        });
        onClose();
      } else {
        setError(res.error || 'Payment execution failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment posting error';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setFullOutstanding = () => {
    setAmountStr(String(invoice.outstandingBalance));
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={`Post Payment: ${invoice.clmsRef}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="secondary" size="md" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={isSubmitting || enteredAmount <= 0 || !calcResult.isValid}
            icon={isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}
            onClick={handlePostPayment}
          >
            {isSubmitting ? 'Posting Payment...' : 'Execute Payment Disbursement'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '-8px', marginBottom: 'var(--space-1)' }}>
          Supplier: <strong>{invoice.supplierName}</strong> &bull; PO: <strong>{invoice.poNumber}</strong>
        </div>

        {error && (
          <Alert type="danger" title="Payment Blocked">
            {error}
          </Alert>
        )}

        {/* Commercial Ledger Position Box */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
              Total Payable Claim:
            </span>
            <FinancialValue amount={invoice.totalPayable} currency={invoice.currency} size="sm" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
              Already Disbursed:
            </span>
            <FinancialValue amount={invoice.cumulativePaid} currency={invoice.currency} size="sm" />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 'var(--space-2)',
              borderTop: '1px solid var(--color-border-hairline)',
              fontWeight: 'var(--font-weight-bold)',
            }}
          >
            <span style={{ fontSize: 'var(--font-size-sm)' }}>Current Outstanding:</span>
            <FinancialValue
              amount={invoice.outstandingBalance}
              currency={invoice.currency}
              size="sm"
              className="text-positive"
            />
          </div>
        </div>

        {/* Inputs */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
            <label
              htmlFor="payment-amount-input"
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Disbursement Amount ({invoice.currency}) *
            </label>
            <button
              type="button"
              onClick={setFullOutstanding}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-brand-primary)',
                fontSize: 'var(--font-size-2xs)',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Pay Full Outstanding ({invoice.outstandingBalance.toLocaleString()})
            </button>
          </div>
          <Input
            id="payment-amount-input"
            type="number"
            min="1"
            max={invoice.outstandingBalance}
            value={amountStr}
            onChange={(e) => {
              setAmountStr(e.target.value);
              setError(null);
            }}
            placeholder="Enter disbursement amount..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div>
            <label
              htmlFor="payment-date-input"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Payment Date *
            </label>
            <Input
              id="payment-date-input"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="payment-ref-input"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Bank / EFT Ref No *
            </label>
            <Input
              id="payment-ref-input"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. EFT-2026-99042"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="funding-source-select"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Funding Source Account *
          </label>
          <select
            id="funding-source-select"
            value={fundingSource}
            onChange={(e) => setFundingSource(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border-hairline)',
              backgroundColor: 'var(--color-surface-card)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <option value="Standard Chartered Operating A/C">Standard Chartered Operating A/C</option>
            <option value="CRDB Corporate Disbursement A/C">CRDB Corporate Disbursement A/C</option>
            <option value="Barclays Capital Capex A/C">Barclays Capital Capex A/C</option>
            <option value="NBC Commercial Treasury A/C">NBC Commercial Treasury A/C</option>
          </select>
        </div>

        {/* Dynamic Post-Payment Forecast */}
        {enteredAmount > 0 && calcResult.isValid && (
          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-surface-sunken)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Projected Balance After Payment:</span>
              <FinancialValue
                amount={calcResult.newOutstandingBalance}
                currency={invoice.currency}
                size="sm"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Projected Commercial State:</span>
              <span
                style={{
                  fontWeight: 'var(--font-weight-bold)',
                  color:
                    calcResult.resultingStatus === 'SETTLED'
                      ? 'var(--color-semantic-success-text)'
                      : 'var(--color-semantic-warning-text)',
                }}
              >
                {calcResult.resultingStatus === 'SETTLED' ? 'FULL SETTLEMENT' : 'PARTIAL PAYMENT'}
              </span>
            </div>
          </div>
        )}

        {/* Financial Guardrails Notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>
          <ShieldCheck size={14} color="var(--color-brand-primary)" />
          <span>PostgreSQL row-level locking strictly enforces: Cumulative Payments &le; Invoiced Payable Value.</span>
        </div>
      </div>
    </Modal>
  );
}

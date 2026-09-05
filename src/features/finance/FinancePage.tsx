// ==============================================================================
// CLMS Finance & Payment Processing Workspace (Enterprise Super Prompt 4)
// ==============================================================================
// Governed by PRODUCT.md Section 29, 30 & 31:
// - Finance Processing Queue (SC_APPROVED -> SETTLED)
// - Immutable Multi-Payment Transaction Ledger
// - Non-Overpayment Concurrency Protections
// - Real-Time Dynamic Aging Engine Evaluation
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  DataTable,
  Column,
  FinancialValue,
  StatusBadge,
  Button,
  Tabs,
  TabItem,
  Drawer,
  Alert,
} from '@/design-system';
import {
  FinanceQueueItem,
  FinanceAgingSummary,
  PaymentTransactionRecord,
  financeRepository,
} from '@/infrastructure/repositories/FinanceRepository';
import { exportToSanitizedCsv } from '@/utils/security/csvSanitizer';
import { PostPaymentModal } from './PostPaymentModal';
import {
  RefreshCw,
  CreditCard,
  History,
  Download,
} from 'lucide-react';

export function FinancePage() {
  const [queue, setQueue] = useState<FinanceQueueItem[]>([]);
  const [summary, setSummary] = useState<FinanceAgingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAgingTab, setActiveAgingTab] = useState('ALL');

  // Modal & Drawer State
  const [paymentTarget, setPaymentTarget] = useState<FinanceQueueItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<FinanceQueueItem | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransactionRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Feedback Notification
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchFinanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [queueData, summaryData] = await Promise.all([
        financeRepository.getFinanceQueue(),
        financeRepository.getFinanceAgingSummary(),
      ]);
      setQueue(queueData);
      setSummary(summaryData);
    } catch (err: unknown) {
      console.error('Failed to load finance workspace:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const handleOpenHistory = async (item: FinanceQueueItem) => {
    setHistoryTarget(item);
    setIsHistoryLoading(true);
    try {
      const history = await financeRepository.getInvoicePaymentHistory(item.id);
      setPaymentHistory(history);
    } catch (err: unknown) {
      console.warn('Failed to load payment transactions:', err);
      setPaymentHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers: Array<{ key: keyof FinanceQueueItem; label: string }> = [
      { key: 'clmsRef', label: 'CLMS Reference' },
      { key: 'supplierInvoiceNo', label: 'Supplier Invoice Number' },
      { key: 'supplierName', label: 'Supplier' },
      { key: 'poNumber', label: 'Purchase Order' },
      { key: 'currency', label: 'Currency' },
      { key: 'totalPayable', label: 'Total Payable' },
      { key: 'cumulativePaid', label: 'Cumulative Paid' },
      { key: 'outstandingBalance', label: 'Outstanding Balance' },
      { key: 'invoiceDate', label: 'Invoice Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'daysOverdue', label: 'Days Overdue' },
      { key: 'agingBucket', label: 'Aging Bracket' },
      { key: 'status', label: 'Status' },
    ];

    const csvContent = exportToSanitizedCsv(
      headers,
      filteredQueue as unknown as Array<Record<string, unknown>>
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CLMS_Finance_Queue_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter queue by active tab
  const filteredQueue = queue.filter((item) => {
    if (activeAgingTab === 'ALL') return true;
    return item.agingBucket === activeAgingTab;
  });

  const agingTabs: TabItem[] = [
    { id: 'ALL', label: `All Claims (${queue.length})` },
    {
      id: 'CURRENT_NOT_DUE',
      label: `Current / Not Due (${queue.filter((i) => i.agingBucket === 'CURRENT_NOT_DUE').length})`,
    },
    {
      id: 'AGING_1_30',
      label: `1–30d Overdue (${queue.filter((i) => i.agingBucket === 'AGING_1_30').length})`,
    },
    {
      id: 'AGING_31_60',
      label: `31–60d Overdue (${queue.filter((i) => i.agingBucket === 'AGING_31_60').length})`,
    },
    {
      id: 'AGING_61_90',
      label: `61–90d Overdue (${queue.filter((i) => i.agingBucket === 'AGING_61_90').length})`,
    },
    {
      id: 'AGING_OVER_90',
      label: `90+d Overdue (${queue.filter((i) => i.agingBucket === 'AGING_OVER_90').length})`,
    },
    {
      id: 'SETTLED',
      label: `Settled (${queue.filter((i) => i.agingBucket === 'SETTLED').length})`,
    },
  ];

  const getAgingBadge = (bucket: string, daysOverdue: number) => {
    switch (bucket) {
      case 'SETTLED':
        return (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-2xs)',
              fontWeight: 'var(--font-weight-semibold)',
              backgroundColor: 'var(--color-semantic-success-bg)',
              color: 'var(--color-semantic-success-text)',
            }}
          >
            Settled
          </span>
        );
      case 'CURRENT_NOT_DUE':
        return (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-2xs)',
              fontWeight: 'var(--font-weight-semibold)',
              backgroundColor: 'var(--color-surface-sunken)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Current
          </span>
        );
      case 'AGING_1_30':
        return (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-2xs)',
              fontWeight: 'var(--font-weight-semibold)',
              backgroundColor: 'var(--color-semantic-warning-bg)',
              color: 'var(--color-semantic-warning-text)',
            }}
          >
            +{daysOverdue}d (1–30)
          </span>
        );
      case 'AGING_31_60':
      case 'AGING_61_90':
      case 'AGING_OVER_90':
        return (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-2xs)',
              fontWeight: 'var(--font-weight-semibold)',
              backgroundColor: 'var(--color-semantic-danger-bg)',
              color: 'var(--color-semantic-danger-text)',
            }}
          >
            +{daysOverdue}d Overdue
          </span>
        );
      default:
        return <span>—</span>;
    }
  };

  const columns: Column<FinanceQueueItem>[] = [
    { header: 'CLMS Ref', accessorKey: 'clmsRef', width: '135px' },
    { header: 'Supplier Invoice No', accessorKey: 'supplierInvoiceNo', width: '150px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    { header: 'PO Number', accessorKey: 'poNumber', width: '130px' },
    {
      header: 'Payable Claim',
      align: 'right',
      cell: (row) => (
        <FinancialValue amount={row.totalPayable} currency={row.currency} size="sm" />
      ),
    },
    {
      header: 'Disbursed',
      align: 'right',
      cell: (row) => (
        <FinancialValue amount={row.cumulativePaid} currency={row.currency} size="sm" />
      ),
    },
    {
      header: 'Outstanding',
      align: 'right',
      cell: (row) => (
        <FinancialValue
          amount={row.outstandingBalance}
          currency={row.currency}
          size="sm"
          className={row.outstandingBalance > 0 ? 'text-positive font-semibold' : 'text-neutral'}
        />
      ),
    },
    {
      header: 'Due Date',
      accessorKey: 'dueDate',
      width: '110px',
      cell: (row) => row.dueDate || '—',
    },
    {
      header: 'Aging',
      align: 'center',
      width: '120px',
      cell: (row) => getAgingBadge(row.agingBucket, row.daysOverdue),
    },
    {
      header: 'Status',
      align: 'center',
      width: '130px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Actions',
      align: 'center',
      width: '180px',
      cell: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<History size={13} />}
            onClick={() => handleOpenHistory(row)}
          >
            History
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={row.outstandingBalance <= 0}
            icon={<CreditCard size={13} />}
            onClick={() => setPaymentTarget(row)}
          >
            Pay
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="clms-finance-page">
      <PageHeader
        title="Finance & Payment Processing"
        description="Process Supply Chain-approved supplier invoices, execute multi-disbursement payment transactions, and monitor real-time aging exposure."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Finance & Payments' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              icon={<Download size={16} />}
              onClick={handleExportCsv}
              disabled={filteredQueue.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
              onClick={fetchFinanceData}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {feedback && (
        <Alert type="success" title="Payment Recorded" style={{ marginBottom: 'var(--space-4)' }} onClose={() => setFeedback(null)}>
          {feedback}
        </Alert>
      )}

      {/* Real Financial Summary Strip */}
      {summary && (
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-surface-card)',
            borderRadius: 'var(--radius-xs)',
            marginBottom: 'var(--space-4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Total Payable Claims
            </span>
            <FinancialValue amount={summary.totalPayable} currency={summary.currency} size="lg" />
          </div>
          <div>
            <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Cumulative Cash Disbursed
            </span>
            <FinancialValue amount={summary.cumulativePaid} currency={summary.currency} size="lg" />
          </div>
          <div>
            <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Current Outstanding Liability
            </span>
            <FinancialValue
              amount={summary.totalOutstanding}
              currency={summary.currency}
              size="lg"
              className="text-positive"
            />
          </div>
          <div>
            <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Total Overdue Liability
            </span>
            <FinancialValue
              amount={summary.aging1to30 + summary.aging31to60 + summary.aging61to90 + summary.agingOver90}
              currency={summary.currency}
              size="lg"
              className="text-negative"
            />
          </div>
        </div>
      )}

      {/* Aging Filter Tabs */}
      <Tabs
        tabs={agingTabs}
        activeTabId={activeAgingTab}
        onTabChange={setActiveAgingTab}
        style={{ marginBottom: 'var(--space-3)' }}
      />

      <DataTable
        columns={columns}
        data={filteredQueue}
        isLoading={isLoading}
        emptyTitle="No invoices found in this view"
        emptyDescription="Invoices approved by the Supply Chain team will automatically arrive in the Finance queue for accounting review and payment settlement."
      />

      {/* Post Payment Modal */}
      {paymentTarget && (
        <PostPaymentModal
          isOpen={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          invoice={paymentTarget}
          onSuccess={(res) => {
            setFeedback(
              `Payment of ${res.amount.toLocaleString()} TZS posted for invoice ${paymentTarget.clmsRef}. Remaining balance: ${res.outstanding.toLocaleString()} TZS (${res.status}).`
            );
            fetchFinanceData();
          }}
        />
      )}

      {/* Payment Transaction Ledger Drawer */}
      <Drawer
        isOpen={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        title={historyTarget ? `Disbursement History: ${historyTarget.clmsRef}` : 'Disbursement History'}
        subtitle={
          historyTarget
            ? `Supplier: ${historyTarget.supplierName} | Payable: TZS ${historyTarget.totalPayable.toLocaleString()}`
            : ''
        }
        width="540px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" size="md" onClick={() => setHistoryTarget(null)}>
              Close
            </Button>
          </div>
        }
      >
        {historyTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Total Paid</span>
                <FinancialValue amount={historyTarget.cumulativePaid} currency={historyTarget.currency} size="sm" />
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Remaining</span>
                <FinancialValue amount={historyTarget.outstandingBalance} currency={historyTarget.currency} size="sm" className="font-semibold" />
              </div>
            </div>

            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
              Transaction Disbursements
            </h4>

            {isHistoryLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
                Loading payment transactions...
              </div>
            ) : paymentHistory.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-6)',
                  color: 'var(--color-text-secondary)',
                  border: '1px dashed var(--color-border-hairline)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                No payment transactions have been recorded yet for this invoice.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {paymentHistory.map((p) => (
                  <div
                    key={p.id}
                    className="border-hairline"
                    style={{
                      padding: 'var(--space-3)',
                      backgroundColor: 'var(--color-surface-card)',
                      borderRadius: 'var(--radius-xs)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-xs)' }}>
                        {p.referenceNumber}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)' }}>
                        {p.fundingSource} &bull; {p.paymentDate}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <FinancialValue amount={p.amount} currency={p.currency} size="sm" className="font-semibold text-positive" />
                      <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>
                        Recorded by: {p.createdByName || 'Finance Officer'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

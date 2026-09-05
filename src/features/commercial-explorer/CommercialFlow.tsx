// ==============================================================================
// CLMS Commercial Flow Dynamic Visualization
// ==============================================================================
// Conforming to PRODUCT.md Section 32:
// Purchase Order -> Certificate -> Supplier Invoice -> Payment Transaction
// ==============================================================================

import { ArrowRight, FileText, Award, DollarSign, CreditCard } from 'lucide-react';
import { FinancialValue } from '@/design-system';
import './CommercialFlow.css';

interface CommercialFlowNode {
  type: 'PO' | 'CERTIFICATE' | 'INVOICE' | 'PAYMENT';
  title: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  date?: string | undefined;
}

interface CommercialFlowProps {
  poNumber: string;
  authorizedAmount: number;
  currency: string;
  certificateRef?: string | undefined;
  certifiedAmount?: number | undefined;
  invoiceRef?: string | undefined;
  invoicedAmount?: number | undefined;
  paymentRef?: string | undefined;
  paidAmount?: number | undefined;
  paymentDate?: string | undefined;
  paymentStatus?: string | undefined;
}

export function CommercialFlow({
  poNumber,
  authorizedAmount,
  currency = 'TZS',
  certificateRef,
  certifiedAmount,
  invoiceRef,
  invoicedAmount,
  paymentRef,
  paidAmount,
  paymentDate,
  paymentStatus,
}: CommercialFlowProps) {
  const nodes: CommercialFlowNode[] = [
    {
      type: 'PO',
      title: 'Purchase Order',
      reference: poNumber,
      amount: authorizedAmount,
      currency,
      status: 'ACTIVE',
    },
    {
      type: 'CERTIFICATE',
      title: 'Certificate',
      reference: certificateRef || 'Awaiting Cert',
      amount: certifiedAmount || 0,
      currency,
      status: certificateRef ? 'ISSUED' : 'UNCOMMENCED',
    },
    {
      type: 'INVOICE',
      title: 'Supplier Invoice',
      reference: invoiceRef || 'Awaiting Invoice',
      amount: invoicedAmount || 0,
      currency,
      status: invoiceRef ? 'SUBMITTED' : 'UNCOMMENCED',
    },
    {
      type: 'PAYMENT',
      title: 'Payment Settlement',
      reference: paymentRef || (paidAmount && paidAmount > 0 ? 'Disbursed' : 'Awaiting Settlement'),
      amount: paidAmount || 0,
      currency,
      status: paymentStatus || (paidAmount && paidAmount >= (invoicedAmount || 1) ? 'SETTLED' : paidAmount && paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNCOMMENCED'),
      date: paymentDate,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'PO':
        return <FileText size={16} color="var(--color-brand-primary)" />;
      case 'CERTIFICATE':
        return <Award size={16} color="var(--color-brand-primary)" />;
      case 'INVOICE':
        return <DollarSign size={16} color="var(--color-brand-primary)" />;
      case 'PAYMENT':
        return <CreditCard size={16} color="var(--color-brand-primary)" />;
      default:
        return null;
    }
  };

  return (
    <div className="clms-commercial-flow border-hairline">
      {nodes.map((node, index) => (
        <div key={node.type} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div className="clms-flow-node border-hairline">
            <div className="clms-flow-node__header">
              {getIcon(node.type)}
              <span className="clms-flow-node__title">{node.title}</span>
            </div>
            <div className="clms-flow-node__ref">{node.reference}</div>
            <FinancialValue amount={node.amount} currency={node.currency} size="sm" className="clms-flow-node__amount" />
            {node.date && (
              <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                {node.date}
              </div>
            )}
          </div>

          {index < nodes.length - 1 && (
            <div className="clms-flow-connector">
              <ArrowRight size={18} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

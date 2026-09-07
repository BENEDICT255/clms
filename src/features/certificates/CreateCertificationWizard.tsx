// ==============================================================================
// CLMS Create Certification Wizard
// ==============================================================================
// 4-Step Wizard per DESIGN.md & PRODUCT.md:
// Step 1: Certificate Type (FAC / PAC / DPC) & Purchase Order selection
// Step 2: Site Selection (Scoped strictly to selected PO)
// Step 3: Financial Calculations (Current % & Amount synchronized, non-overcertification)
// Step 4: Review & Submit to Approval Pipeline

import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, FinancialValue, StatusBadge } from '@/design-system';
import {
  CertificationEngine,
  CertificateType,
  CertificateCalculationResult,
} from '@/domain/certification/CertificationEngine';
import {
  certificateRepository,
} from '@/infrastructure/repositories/CertificateRepository';
import {
  commercialExplorerRepository,
  CommercialExplorerRecord,
} from '@/infrastructure/repositories/CommercialExplorerRepository';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface CreateCertificationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (certId: string) => void;
  initialSite?: CommercialExplorerRecord | null;
}

type WizardStep = 1 | 2 | 3 | 4;

export function CreateCertificationWizard({
  isOpen,
  onClose,
  onSuccess,
  initialSite,
}: CreateCertificationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [certType, setCertType] = useState<CertificateType>('FAC');
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>('');
  const [allSites, setAllSites] = useState<CommercialExplorerRecord[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [siteInputs, setSiteInputs] = useState<Record<string, { currentPercentage?: number; currentAmount?: number }>>({});
  const [bulkPercentage, setBulkPercentage] = useState<string>('100');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Load available commercial records
  useEffect(() => {
    async function load() {
      const records = await commercialExplorerRepository.searchRecords();
      setAllSites(records);

      if (initialSite) {
        setSelectedPoNumber(initialSite.poNumber);
        setSelectedSiteIds([initialSite.poSiteId]);
      } else if (records.length > 0) {
        setSelectedPoNumber((current) => current || records[0].poNumber);
      }
    }
    load();
  }, [initialSite]);

  // Distinct POs available
  const availablePOs = useMemo(() => {
    const map = new Map<string, { poId: string; poNumber: string; supplierName: string; currency: string }>();
    allSites.forEach((s) => {
      if (!map.has(s.poNumber)) {
        map.set(s.poNumber, {
          poId: s.poId,
          poNumber: s.poNumber,
          supplierName: s.supplierName,
          currency: s.currency,
        });
      }
    });
    return Array.from(map.values());
  }, [allSites]);

  // Sites belonging strictly to selected PO
  const eligibleSitesForPO = useMemo(() => {
    return allSites.filter((s) => s.poNumber === selectedPoNumber);
  }, [allSites, selectedPoNumber]);

  // Selected PO object
  const activePO = availablePOs.find((p) => p.poNumber === selectedPoNumber);

  // When changing PO, clear sites not in this PO
  const handlePoChange = (poNum: string) => {
    setSelectedPoNumber(poNum);
    setSelectedSiteIds([]);
    setSiteInputs({});
  };

  const handleToggleSite = (poSiteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(poSiteId) ? prev.filter((id) => id !== poSiteId) : [...prev, poSiteId]
    );
  };

  const certifiableSites = useMemo(() => {
    return eligibleSitesForPO.filter((s) => s.remainingCertifiable > 0);
  }, [eligibleSitesForPO]);

  const areAllEligibleSelected = useMemo(() => {
    return (
      certifiableSites.length > 0 &&
      certifiableSites.every((s) => selectedSiteIds.includes(s.poSiteId))
    );
  }, [certifiableSites, selectedSiteIds]);

  const handleToggleSelectAllSites = () => {
    if (areAllEligibleSelected) {
      setSelectedSiteIds([]);
    } else {
      setSelectedSiteIds(certifiableSites.map((s) => s.poSiteId));
    }
  };

  // Synchronize site inputs with domain calculation engine
  const calculationResult: CertificateCalculationResult = useMemo(() => {
    if (!activePO || selectedSiteIds.length === 0) {
      return {
        isValid: false,
        certType,
        poId: activePO?.poId || '',
        currency: activePO?.currency || 'TZS',
        totalCertifiedAmount: 0,
        siteItems: [],
        errors: selectedSiteIds.length === 0 ? ['No sites selected'] : [],
        warnings: [],
      };
    }

    const sitesToCalc = selectedSiteIds
      .map((id) => eligibleSitesForPO.find((s) => s.poSiteId === id))
      .filter((s): s is CommercialExplorerRecord => Boolean(s))
      .map((s) => {
        const input = siteInputs[s.poSiteId];
        const item: {
          poSiteId: string;
          siteIdExt: string;
          siteName: string;
          authorizedAmount: number;
          previouslyCertifiedAmount: number;
          currentAmount?: number;
          currentPercentage?: number;
        } = {
          poSiteId: s.poSiteId,
          siteIdExt: s.siteIdExt,
          siteName: s.siteName,
          authorizedAmount: s.authorizedValue,
          previouslyCertifiedAmount: s.cumulativeCertified,
        };
        if (input?.currentAmount !== undefined) {
          item.currentAmount = input.currentAmount;
        }
        if (input?.currentPercentage !== undefined) {
          item.currentPercentage = input.currentPercentage;
        }
        return item;
      });

    return CertificationEngine.calculateCertification({
      certType,
      poId: activePO.poId,
      currency: activePO.currency,
      sites: sitesToCalc,
    });
  }, [activePO, selectedSiteIds, eligibleSitesForPO, siteInputs, certType]);

  const handleApplyBulkPercentage = () => {
    const pct = parseFloat(bulkPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) return;

    const newInputs: Record<string, { currentPercentage?: number; currentAmount?: number }> = {};
    selectedSiteIds.forEach((id) => {
      newInputs[id] = { currentPercentage: pct };
    });
    setSiteInputs(newInputs);
  };

  const handleSiteAmountChange = (poSiteId: string, amountStr: string) => {
    const amt = parseFloat(amountStr) || 0;
    setSiteInputs((prev) => {
      const copy = { ...prev };
      copy[poSiteId] = { currentAmount: amt };
      return copy;
    });
  };

  const handleSitePercentageChange = (poSiteId: string, pctStr: string) => {
    const pct = parseFloat(pctStr) || 0;
    setSiteInputs((prev) => {
      const copy = { ...prev };
      copy[poSiteId] = { currentPercentage: pct };
      return copy;
    });
  };

  const handleSubmitCertificate = async () => {
    if (!calculationResult.isValid || !activePO) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const sitesPayload = calculationResult.siteItems.map((item) => ({
        poSiteId: item.poSiteId,
        currentAmount: item.currentCertificationAmount,
        percentage: item.currentPercentage,
      }));

      const res = await certificateRepository.createCertificate({
        certType,
        poId: activePO.poId,
        currency: activePO.currency,
        sites: sitesPayload,
        notes,
      });

      if (!res.success) {
        setSubmissionError(res.error || 'Failed to create certificate.');
        return;
      }

      onSuccess?.(res.certificateId!);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected failure.';
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Site Acceptance Certification"
      width="760px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {currentStep > 1 ? (
            <Button
              variant="secondary"
              icon={<ArrowLeft size={16} />}
              onClick={() => setCurrentStep((prev) => (prev - 1) as WizardStep)}
            >
              Previous
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {currentStep < 4 ? (
              <Button
                variant="primary"
                icon={<ArrowRight size={16} />}
                disabled={
                  (currentStep === 1 && !selectedPoNumber) ||
                  (currentStep === 2 && selectedSiteIds.length === 0) ||
                  (currentStep === 3 && !calculationResult.isValid)
                }
                onClick={() => setCurrentStep((prev) => (prev + 1) as WizardStep)}
              >
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Award size={16} />}
                isLoading={isSubmitting}
                disabled={!calculationResult.isValid}
                onClick={handleSubmitCertificate}
              >
                Submit for Approval
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="clms-cert-wizard" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Step Progression Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--space-2)',
            borderBottom: '1px solid var(--color-border-hairline)',
            paddingBottom: 'var(--space-3)',
          }}
        >
          {[
            { num: 1, label: '1. Type & PO' },
            { num: 2, label: '2. Site Scope' },
            { num: 3, label: '3. Valuation' },
            { num: 4, label: '4. Signoff' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                textAlign: 'center',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-xs)',
                fontWeight: currentStep === s.num ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                color: currentStep === s.num ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                backgroundColor: currentStep === s.num ? 'var(--color-surface-sunken)' : 'transparent',
                fontSize: 'var(--font-size-xs)',
              }}
            >
              {s.label}
            </div>
          ))}
        </div>

        {submissionError && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-semantic-error-bg)',
              color: 'var(--color-semantic-error-text)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <AlertTriangle size={16} />
            <span>{submissionError}</span>
          </div>
        )}

        {/* STEP 1: TYPE & PO */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-2)' }}>
                Milestone Certificate Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                {[
                  {
                    type: 'FAC' as CertificateType,
                    title: 'FAC — Final Acceptance',
                    desc: 'Final commercial settlement milestone releasing residual balance.',
                  },
                  {
                    type: 'PAC' as CertificateType,
                    title: 'PAC — Provisional Acceptance',
                    desc: 'Progress milestone certification authorizing stage invoicing.',
                  },
                  {
                    type: 'DPC' as CertificateType,
                    title: 'DPC — Down Payment',
                    desc: 'Advance commitment certificate recorded as exposure.',
                  },
                ].map((item) => (
                  <div
                    key={item.type}
                    onClick={() => setCertType(item.type)}
                    style={{
                      border: certType === item.type ? '2px solid var(--color-brand-primary)' : '1px solid var(--color-border-hairline)',
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                      backgroundColor: certType === item.type ? 'var(--color-surface-card)' : 'transparent',
                    }}
                  >
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-1)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-2)' }}>
                Select Purchase Order (Single PO Rule)
              </label>
              {availablePOs.length === 0 ? (
                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  No approved Purchase Orders found in database. Please import an approved BOQ + PO package first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {availablePOs.map((po) => (
                    <div
                      key={po.poNumber}
                      onClick={() => handlePoChange(po.poNumber)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-xs)',
                        border: selectedPoNumber === po.poNumber ? '2px solid var(--color-brand-primary)' : '1px solid var(--color-border-hairline)',
                        cursor: 'pointer',
                        backgroundColor: selectedPoNumber === po.poNumber ? 'var(--color-surface-card)' : 'transparent',
                      }}
                    >
                      <div>
                        <strong>{po.poNumber}</strong> — Vendor: {po.supplierName}
                      </div>
                      <StatusBadge status="ACTIVE" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: SITE SELECTION */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Sites under Purchase Order: {selectedPoNumber}
                </span>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Select sites ready for commercial certification. Only sites with positive remaining balance are eligible.
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={handleToggleSelectAllSites}>
                {areAllEligibleSelected ? 'Deselect All' : 'Select All Eligible'}
              </Button>
            </div>

            <div
              className="border-hairline"
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                <thead style={{ backgroundColor: 'var(--color-surface-sunken)', borderBottom: '1px solid var(--color-border-hairline)' }}>
                  <tr>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left', width: '40px' }}></th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Site ID</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Site Name</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Authorized</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Previously Certified</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Remaining Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleSitesForPO.map((s) => {
                    const isSelected = selectedSiteIds.includes(s.poSiteId);
                    const isEligible = s.remainingCertifiable > 0;
                    return (
                      <tr
                        key={s.poSiteId}
                        onClick={() => isEligible && handleToggleSite(s.poSiteId)}
                        style={{
                          borderBottom: '1px solid var(--color-border-hairline)',
                          backgroundColor: isSelected ? 'var(--color-surface-sunken)' : 'transparent',
                          cursor: isEligible ? 'pointer' : 'not-allowed',
                          opacity: isEligible ? 1 : 0.5,
                        }}
                      >
                        <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isEligible}
                            onChange={() => isEligible && handleToggleSite(s.poSiteId)}
                          />
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 'var(--font-weight-medium)' }}>
                          {s.siteIdExt}
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)' }}>{s.siteName}</td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                          <FinancialValue amount={s.authorizedValue} currency={s.currency} size="sm" />
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                          <FinancialValue amount={s.cumulativeCertified} currency={s.currency} size="sm" />
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)' }}>
                          <FinancialValue
                            amount={s.remainingCertifiable}
                            currency={s.currency}
                            size="sm"
                            className={s.remainingCertifiable > 0 ? 'text-positive' : ''}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Selected: <strong>{selectedSiteIds.length}</strong> of {eligibleSitesForPO.length} sites
            </div>
          </div>
        )}

        {/* STEP 3: FINANCIAL VALUATION & CALCULATIONS */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              className="border-hairline"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-surface-sunken)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Bulk % Application:
                </span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={bulkPercentage}
                  onChange={(e) => setBulkPercentage(e.target.value)}
                  style={{ width: '70px', padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-xs)' }}
                />
                <Button variant="secondary" size="sm" onClick={handleApplyBulkPercentage}>
                  Apply to All Selected
                </Button>
              </div>

              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginRight: 'var(--space-2)' }}>
                  Total Valuation:
                </span>
                <FinancialValue
                  amount={calculationResult.totalCertifiedAmount}
                  currency={calculationResult.currency}
                  size="md"
                  className="font-bold text-positive"
                />
              </div>
            </div>

            {calculationResult.errors.length > 0 && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-semantic-error-bg)',
                  color: 'var(--color-semantic-error-text)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                {calculationResult.errors.map((e, idx) => (
                  <div key={idx}>• {e}</div>
                ))}
              </div>
            )}

            {calculationResult.warnings.length > 0 && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-semantic-warning-bg)',
                  color: 'var(--color-semantic-warning-text)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                {calculationResult.warnings.map((w, idx) => (
                  <div key={idx}>• {w}</div>
                ))}
              </div>
            )}

            <div
              className="border-hairline"
              style={{
                maxHeight: '280px',
                overflowY: 'auto',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                <thead style={{ backgroundColor: 'var(--color-surface-sunken)', borderBottom: '1px solid var(--color-border-hairline)' }}>
                  <tr>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Site</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Authorized</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Remaining</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', width: '80px' }}>Current %</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', width: '130px' }}>Cert Amount</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>After Cert</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationResult.siteItems.map((item) => (
                    <tr key={item.poSiteId} style={{ borderBottom: '1px solid var(--color-border-hairline)' }}>
                      <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                        <strong>{item.siteIdExt}</strong>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '10px' }}>{item.siteName}</div>
                      </td>
                      <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                        <FinancialValue amount={item.authorizedAmount} currency={calculationResult.currency} size="sm" />
                      </td>
                      <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                        <FinancialValue amount={item.remainingBeforeCert} currency={calculationResult.currency} size="sm" />
                      </td>
                      <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                        <input
                          type="number"
                          value={siteInputs[item.poSiteId]?.currentPercentage ?? item.currentPercentage}
                          onChange={(e) => handleSitePercentageChange(item.poSiteId, e.target.value)}
                          style={{ width: '65px', textAlign: 'right', fontSize: 'var(--font-size-xs)' }}
                        />
                      </td>
                      <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                        <input
                          type="number"
                          value={siteInputs[item.poSiteId]?.currentAmount ?? item.currentCertificationAmount}
                          onChange={(e) => handleSiteAmountChange(item.poSiteId, e.target.value)}
                          style={{ width: '110px', textAlign: 'right', fontSize: 'var(--font-size-xs)' }}
                        />
                      </td>
                      <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)' }}>
                        <FinancialValue amount={item.remainingAfterCert} currency={calculationResult.currency} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & SIGNOFF PIPELINE */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-surface-sunken)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Certificate Type:</span>
                <h4 style={{ margin: 'var(--space-1) 0' }}>{certType} — Site Acceptance</h4>
                <div style={{ fontSize: 'var(--font-size-xs)' }}>PO: <strong>{selectedPoNumber}</strong> | Vendor: <strong>{activePO?.supplierName}</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Total Certified Valuation:</span>
                <FinancialValue
                  amount={calculationResult.totalCertifiedAmount}
                  currency={calculationResult.currency}
                  size="lg"
                  className="font-bold text-positive"
                />
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Sites included: {calculationResult.siteItems.length}
                </div>
              </div>
            </div>

            {/* Structured Approval Route per PRODUCT.md */}
            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                Multi-Stage Projects Approval Route
              </h4>
              <div
                className="border-hairline"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-brand-primary)" />
                  <div>
                    <strong>Stage 1: Author (Projects Engineer)</strong>
                    <div style={{ color: 'var(--color-text-secondary)' }}>Draft authoring & scope valuation</div>
                  </div>
                </div>
                <div>→</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Award size={16} color="var(--color-text-secondary)" />
                  <div>
                    <strong>Stage 2: Project Lead</strong>
                    <div style={{ color: 'var(--color-text-secondary)' }}>Commercial scope endorsement</div>
                  </div>
                </div>
                <div>→</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Award size={16} color="var(--color-text-secondary)" />
                  <div>
                    <strong>Stage 3: Head of Projects</strong>
                    <div style={{ color: 'var(--color-text-secondary)' }}>Executive approval & release</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Commercial Remarks / Notes:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional commercial notes or milestone justifications..."
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border-hairline)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

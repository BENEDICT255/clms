// ==============================================================================
// CLMS Commercial Package Ingestion Wizard
// ==============================================================================
// 5-Step Pipeline conforming to PRODUCT.md Section 12 & DESIGN.md:
// Context -> Documents -> Processing -> Diagnostic Review -> Confirm
// ==============================================================================

import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  DataTable,
  Column,
  FinancialValue,
  FinancialSummaryStrip,
  Alert,
  Spinner,
} from '@/design-system';
import {
  commercialPackageRepository,
  ProjectLookup,
  SupplierLookup,
} from '@/infrastructure/repositories/CommercialPackageRepository';
import { IngestionService, IngestionSessionState, canConfirmCommercialPackage } from '@/application/services/IngestionService';
import { CommercialCrossValidator } from '@/domain/commercial/CrossValidator';
import { ExtractedSiteLine } from '@/domain/commercial/types';
import { useAuth } from '@/app/providers/AuthContext';
import './ImportPackageWizard.css';

interface ImportPackageWizardProps {
  onSuccess: (packageId: string) => void;
  onCancel: () => void;
}

export function ImportPackageWizard({ onSuccess, onCancel }: ImportPackageWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [projects, setProjects] = useState<ProjectLookup[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierLookup[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const [boqFile, setBoqFile] = useState<File | null>(null);
  const [poFile, setPoFile] = useState<File | null>(null);

  const [, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Initializing extraction pipeline...');
  const [processingError, setProcessingError] = useState<string | null>(null);

  const [session, setSession] = useState<IngestionSessionState | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

  // Manual site override state
  const [editingSiteIndex, setEditingSiteIndex] = useState<number | null>(null);
  const [overrideAmount, setOverrideAmount] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');

  const boqInputRef = useRef<HTMLInputElement>(null);
  const poInputRef = useRef<HTMLInputElement>(null);

  const confirmationGate = session
    ? canConfirmCommercialPackage(
        session.boqResult,
        session.poResult,
        session.normalizedData?.crossValidation ?? null
      )
    : { canConfirm: false, blockingReasons: ['No active commercial document session.'] };

  useEffect(() => {
    Promise.all([
      commercialPackageRepository.getProjects(),
      commercialPackageRepository.getSuppliers(),
    ]).then(([projList, supList]) => {
      setProjects(projList);
      setSuppliers(supList);
      if (projList[0]) setSelectedProjectId(projList[0].id);
      if (supList[0]) setSelectedSupplierId(supList[0].id);
    });
  }, []);

  const handleStartProcessing = async () => {
    if (!boqFile || !poFile) {
      setProcessingError('Both an Approved BOQ spreadsheet and an Approved PO document are required.');
      return;
    }

    setStep(3);
    setIsProcessing(true);
    setProcessingError(null);

    const activeSupplier = suppliers.find((s) => s.id === selectedSupplierId);
    const activeProject = projects.find((p) => p.id === selectedProjectId);

    try {
      setProcessingStatus('Computing cryptographic SHA-256 file hashes...');
      await new Promise((r) => setTimeout(r, 200));

      setProcessingStatus('Detecting registered template version & sheet structures...');
      await new Promise((r) => setTimeout(r, 200));

      setProcessingStatus('Extracting commercial site lines & calculating totals...');
      const { boqResult, poResult, normalized, boqHash, poHash } =
        await IngestionService.processDocuments(boqFile, poFile, activeSupplier?.name || '');

      setProcessingStatus('Executing cross-validation between BOQ and PO...');
      await new Promise((r) => setTimeout(r, 200));

      setSession({
        projectId: selectedProjectId,
        projectName: activeProject?.name || '',
        projectTypeId: activeProject?.projectTypeId || '',
        supplierId: selectedSupplierId,
        supplierName: activeSupplier?.name || '',
        boqFile,
        boqFileHash: boqHash,
        poFile,
        poFileHash: poHash,
        boqResult,
        poResult,
        normalizedData: normalized,
        step: 4,
        isProcessing: false,
        processingStage: 'Ready for human review',
        isConfirmed: false,
      });

      setIsProcessing(false);
      setStep(4);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Unknown parsing error';
      setProcessingError(`Extraction halted: ${msg}`);
      setStep(2);
    }
  };

  const handleSaveOverride = () => {
    if (editingSiteIndex === null || !session?.normalizedData) return;
    const num = parseFloat(overrideAmount.replace(/[^0-9.-]/g, ''));
    if (isNaN(num) || num < 0 || !overrideReason.trim()) {
      alert('Please provide a valid non-negative amount and documented reason for this override.');
      return;
    }

    const updatedSites = IngestionService.applySiteOverride(
      session.normalizedData.sites,
      editingSiteIndex,
      num,
      overrideReason.trim()
    );

    const newTotal = updatedSites.reduce((sum, s) => sum + s.authorizedAmount, 0);

    const updatedBOQ = session.boqResult
      ? {
          ...session.boqResult,
          sites: updatedSites,
          totalAmount: newTotal,
        }
      : null;

    const crossValidation =
      updatedBOQ && session.poResult
        ? CommercialCrossValidator.validate(updatedBOQ, session.poResult, {
            selectedSupplierName: session.supplierName,
          })
        : session.normalizedData.crossValidation;

    setSession({
      ...session,
      boqResult: updatedBOQ,
      normalizedData: {
        ...session.normalizedData,
        sites: updatedSites,
        boqTotalAmount: newTotal,
        crossValidation,
      },
    });

    setEditingSiteIndex(null);
    setOverrideAmount('');
    setOverrideReason('');
  };

  const handleConfirmPackage = async () => {
    if (!session || !session.normalizedData) return;

    const gate = canConfirmCommercialPackage(
      session.boqResult,
      session.poResult,
      session.normalizedData.crossValidation
    );

    if (!gate.canConfirm) {
      alert(`COMMERCIAL PACKAGE CANNOT BE CONFIRMED:\n\n${gate.blockingReasons.join('\n')}`);
      return;
    }

    setIsSubmittingConfirm(true);

    try {
      const result = await IngestionService.confirmPackage(session, user?.id);
      if (result.success && result.packageId) {
        onSuccess(result.packageId);
      } else {
        alert(`Failed to commit commercial package: ${result.error || 'Server error'}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown server error';
      alert(`Confirmation transaction failed: ${msg}`);
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  // Sites review table columns
  const siteReviewColumns: Column<ExtractedSiteLine>[] = [
    { header: 'Site ID', accessorKey: 'siteIdExt', width: '130px' },
    { header: 'Site Name', accessorKey: 'siteName' },
    { header: 'Region', accessorKey: 'region', width: '120px' },
    {
      header: 'Authorized Amount',
      align: 'right',
      cell: (row) => (
        <div>
          <FinancialValue amount={row.authorizedAmount} currency={session?.normalizedData?.currency || 'TZS'} size="sm" />
          {row.isOverridden && (
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--color-brand-primary)',
                fontStyle: 'italic',
              }}
            >
              Overridden: {row.overrideReason}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Action',
      align: 'center',
      width: '100px',
      cell: (row) => {
        const idx = session?.normalizedData?.sites.findIndex((s) => s.siteIdExt === row.siteIdExt) ?? -1;
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingSiteIndex(idx);
              setOverrideAmount(String(row.authorizedAmount));
              setOverrideReason(row.overrideReason || '');
            }}
          >
            Edit
          </Button>
        );
      },
    },
  ];

  return (
    <div className="clms-wizard border-hairline">
      {/* 5-Step Stepper */}
      <div className="clms-wizard__stepper border-hairline">
        <div className={`clms-wizard__step ${step === 1 ? 'clms-wizard__step--active' : step > 1 ? 'clms-wizard__step--completed' : ''}`}>
          <div className="clms-wizard__step-badge">{step > 1 ? '✓' : '1'}</div>
          <span>1. Context</span>
        </div>
        <div className="clms-wizard__divider" />
        <div className={`clms-wizard__step ${step === 2 ? 'clms-wizard__step--active' : step > 2 ? 'clms-wizard__step--completed' : ''}`}>
          <div className="clms-wizard__step-badge">{step > 2 ? '✓' : '2'}</div>
          <span>2. Documents</span>
        </div>
        <div className="clms-wizard__divider" />
        <div className={`clms-wizard__step ${step === 3 ? 'clms-wizard__step--active' : step > 3 ? 'clms-wizard__step--completed' : ''}`}>
          <div className="clms-wizard__step-badge">{step > 3 ? '✓' : '3'}</div>
          <span>3. Processing</span>
        </div>
        <div className="clms-wizard__divider" />
        <div className={`clms-wizard__step ${step === 4 ? 'clms-wizard__step--active' : step > 4 ? 'clms-wizard__step--completed' : ''}`}>
          <div className="clms-wizard__step-badge">{step > 4 ? '✓' : '4'}</div>
          <span>4. Review</span>
        </div>
        <div className="clms-wizard__divider" />
        <div className={`clms-wizard__step ${step === 5 ? 'clms-wizard__step--active' : ''}`}>
          <div className="clms-wizard__step-badge">5</div>
          <span>5. Confirm</span>
        </div>
      </div>

      {processingError && (
        <Alert type="warning" title="Ingestion Warning" className="mb-4">
          {processingError}
        </Alert>
      )}

      {/* STEP 1: CONTEXT */}
      {step === 1 && (
        <div className="clms-wizard__content">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            Step 1: Select Operational Context
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            Bind the commercial package to an authorized Project and Vendor organization.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', maxWidth: '640px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Target Project
              </label>
              <select
                className="clms-input border-hairline"
                style={{ width: '100%' }}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
                {projects.length === 0 && <option value="">No active projects configured</option>}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Supplier Organization
              </label>
              <select
                className="clms-input border-hairline"
                style={{ width: '100%' }}
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.vendorCode})
                  </option>
                ))}
                {suppliers.length === 0 && <option value="">No active suppliers configured</option>}
              </select>
            </div>
          </div>

          <div className="clms-wizard__actions">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedProjectId || !selectedSupplierId}
              icon={<ArrowRight size={16} />}
              onClick={() => setStep(2)}
            >
              Continue to Document Upload
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: DOCUMENT UPLOADS */}
      {step === 2 && (
        <div className="clms-wizard__content">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            Step 2: Upload Approved Commercial Documents
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Upload the paired approved Bill of Quantities (BOQ) spreadsheet and Purchase Order (PO).
          </p>

          <div className="clms-wizard__dropzones">
            {/* BOQ Dropzone */}
            <div
              className="clms-wizard__dropzone border-hairline"
              onClick={() => boqInputRef.current?.click()}
            >
              <input
                ref={boqInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setBoqFile(e.target.files[0]);
                  }
                }}
              />
              <FileSpreadsheet size={36} className="clms-wizard__dropzone-icon" />
              <div className="clms-wizard__dropzone-title">Approved BOQ Spreadsheet</div>
              <div className="clms-wizard__dropzone-hint">Excel workbook (.xlsx, .xls) containing site lines</div>
              {boqFile && (
                <div className="clms-wizard__file-pill border-hairline">
                  <CheckCircle size={14} color="var(--color-semantic-success-text)" />
                  <span>{boqFile.name}</span>
                </div>
              )}
            </div>

            {/* PO Dropzone */}
            <div
              className="clms-wizard__dropzone border-hairline"
              onClick={() => poInputRef.current?.click()}
            >
              <input
                ref={poInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPoFile(e.target.files[0]);
                  }
                }}
              />
              <FileText size={36} className="clms-wizard__dropzone-icon" />
              <div className="clms-wizard__dropzone-title">Approved Purchase Order (PO)</div>
              <div className="clms-wizard__dropzone-hint">PDF or spreadsheet signed PO document</div>
              {poFile && (
                <div className="clms-wizard__file-pill border-hairline">
                  <CheckCircle size={14} color="var(--color-semantic-success-text)" />
                  <span>{poFile.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="clms-wizard__actions">
            <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={!boqFile || !poFile}
              icon={<Upload size={16} />}
              onClick={handleStartProcessing}
            >
              Start Commercial Ingestion
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PROCESSING SKELETON */}
      {step === 3 && (
        <div className="clms-wizard__content" style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
          <Spinner size="lg" className="mb-4" />
          <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            Processing Commercial Documents
          </h4>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
            {processingStatus}
          </p>
        </div>
      )}

      {/* STEP 4: DIAGNOSTIC REVIEW */}
      {step === 4 && session?.normalizedData && (
        <div className="clms-wizard__content">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            Step 4: Diagnostic Review & Commercial Verification
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Review extracted values, reconciled site allocations, and cross-validation status prior to binding commitments.
          </p>

          {/* Diagnostic Cross-Validation & Ingestion Gate Status (Sections 13, 14) */}
          {!confirmationGate.canConfirm ? (
            <Alert type="warning" title="COMMERCIAL PACKAGE CANNOT BE CONFIRMED" className="mb-4">
              <div style={{ marginBottom: 'var(--space-2)' }}>
                The following commercial blocking reasons must be remediated before this commitment can be confirmed:
              </div>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                {confirmationGate.blockingReasons.map((reason, idx) => (
                  <li key={idx} style={{ marginBottom: 'var(--space-1)' }}>
                    {reason}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : session.normalizedData.crossValidation.hasWarnings ? (
            <Alert type="warning" title="Commercial Cross-Validation Warnings" className="mb-4">
              <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                {session.normalizedData.crossValidation.warningMessages.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </Alert>
          ) : (
            <Alert type="success" title="Commercial Cross-Validation Passed" className="mb-4">
              All extracted values, currencies, and site totals reconcile perfectly between the BOQ and Purchase Order.
            </Alert>
          )}

          {/* Metric Summary Strip (Section 16: typed metric model) */}
          <FinancialSummaryStrip
            metrics={[
              { kind: 'text', label: 'Purchase Order No', value: session.normalizedData.poNumber || '—' },
              { kind: 'money', label: 'Total Authorized Commitment', amount: session.normalizedData.boqTotalAmount, currency: session.normalizedData.currency },
              { kind: 'count', label: 'Extracted Sites', value: session.normalizedData.sites.length, suffix: 'Sites' },
              { kind: 'text', label: 'Detected Template', value: session.normalizedData.templateVersion.replace(/^BOQ_TEMPLATE_/i, '').replace(/_/g, ' ') },
            ]}
            style={{ marginBottom: 'var(--space-4)' }}
          />

          {/* Site rows table */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Extracted Commercial Sites ({session.normalizedData.sites.length})
            </h4>
            <DataTable
              columns={siteReviewColumns}
              data={session.normalizedData.sites}
              emptyTitle="No sites extracted"
            />
          </div>

          {/* Manual Site Edit Modal if selected */}
          {editingSiteIndex !== null && (
            <div
              className="border-hairline"
              style={{
                backgroundColor: 'var(--color-surface-sunken)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-xs)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                Correct Extracted Site Line (Site: {session.normalizedData.sites[editingSiteIndex]?.siteIdExt})
              </h5>
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ width: '180px' }}>
                  <label style={{ fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                    Corrected Authorized Sum (TZS)
                  </label>
                  <input
                    className="clms-input border-hairline"
                    type="number"
                    value={overrideAmount}
                    onChange={(e) => setOverrideAmount(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                    Documented Reason for Correction (Mandatory Audit Requirement)
                  </label>
                  <input
                    className="clms-input border-hairline"
                    type="text"
                    placeholder="e.g., Typo corrected per signed amendment addendum..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditingSiteIndex(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveOverride}>
                    Apply Correction
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="clms-wizard__actions">
            <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => setStep(2)}>
              Back to Documents
            </Button>
            <Button
              variant="primary"
              disabled={!confirmationGate.canConfirm}
              icon={<ArrowRight size={16} />}
              onClick={() => {
                if (confirmationGate.canConfirm) {
                  setStep(5);
                }
              }}
            >
              Proceed to Confirmation
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: FINAL CONFIRMATION */}
      {step === 5 && session?.normalizedData && (
        <div className="clms-wizard__content" style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <ShieldCheck size={48} color="var(--color-brand-primary)" style={{ margin: '0 auto var(--space-3)' }} />
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Confirm Commercial Package
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Confirming commits structured commercial records to the digital ledger. Downstream site certification and invoicing will be bound to these authorized figures.
            </p>
          </div>

          <div
            className="border-hairline"
            style={{
              backgroundColor: 'var(--color-surface-sunken)',
              padding: 'var(--space-4) var(--space-6)',
              borderRadius: 'var(--radius-xs)',
              marginBottom: 'var(--space-6)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Project:</span>
              <strong>{session.projectName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Supplier:</span>
              <strong>{session.supplierName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Purchase Order:</span>
              <strong>{session.normalizedData.poNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Authorized Commitment:</span>
              <FinancialValue amount={session.normalizedData.boqTotalAmount} currency={session.normalizedData.currency} size="md" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Authorized Sites:</span>
              <strong>{session.normalizedData.sites.length} Sites</strong>
            </div>
          </div>

          <div className="clms-wizard__actions" style={{ justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => setStep(4)} disabled={isSubmittingConfirm}>
              Review Diagnostics
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmittingConfirm}
              disabled={isSubmittingConfirm || !confirmationGate.canConfirm}
              icon={<CheckCircle size={16} />}
              onClick={handleConfirmPackage}
            >
              Confirm & Commit Commercial Package
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

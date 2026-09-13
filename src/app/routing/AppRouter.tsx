import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '@/features/shell/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { CommercialExplorerPage } from '@/features/commercial-explorer/CommercialExplorerPage';
import { CommercialPackagesPage } from '@/features/commercial-packages/CommercialPackagesPage';
import { CertificatesPage } from '@/features/certificates/CertificatesPage';
import { SupplierCertificatesPage } from '@/features/supplier/SupplierCertificatesPage';
import { InvoicesPage } from '@/features/invoices/InvoicesPage';
import { SupplyChainPage } from '@/features/supply-chain/SupplyChainPage';
import { FinancePage } from '@/features/finance/FinancePage';
import { ManagementPage } from '@/features/management/ManagementPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { POLifecyclePage } from '@/features/po-lifecycle/POLifecyclePage';
import { NotFoundPage } from '@/features/common/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Application Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route
          path="explorer"
          element={
            <ProtectedRoute requiredCapability="explorer.view">
              <CommercialExplorerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commercial-packages"
          element={
            <ProtectedRoute requiredCapability="package.import">
              <CommercialPackagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="certificates"
          element={
            <ProtectedRoute requiredCapability="certificate.create">
              <CertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="supplier/certificates"
          element={
            <ProtectedRoute requiredCapability="invoice.create">
              <SupplierCertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route
          path="supply-chain"
          element={
            <ProtectedRoute requiredCapability="invoice.review.sc">
              <SupplyChainPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance"
          element={
            <ProtectedRoute requiredCapability="finance.process">
              <FinancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="management"
          element={
            <ProtectedRoute requiredCapability="report.view.executive">
              <ManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute requiredCapability="config.manage">
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="po-lifecycle" element={<POLifecyclePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

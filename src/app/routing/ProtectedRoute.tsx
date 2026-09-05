import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { CapabilityCode } from '@/domain/identity/types';
import { UnauthorizedState } from '@/design-system';
import { Spinner } from '@/design-system';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredCapability?: CapabilityCode;
}

export function ProtectedRoute({ children, requiredCapability }: ProtectedRouteProps) {
  const { session, isLoading, can } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-surface-canvas)',
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredCapability && !can(requiredCapability)) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <UnauthorizedState
          title="Restricted Workspace"
          message={`Your assigned role does not hold the "${requiredCapability}" capability required to access this commercial view.`}
        />
      </div>
    );
  }

  return <>{children}</>;
}

import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/design-system';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 'var(--space-12) var(--space-4)' }}>
      <EmptyState
        title="404 — Page Not Found"
        description="The commercial view or resource you requested does not exist or has been moved."
        actionLabel="Return to Overview"
        onAction={() => navigate('/')}
      />
    </div>
  );
}

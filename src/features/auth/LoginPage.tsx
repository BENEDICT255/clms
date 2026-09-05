import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { Button, Input, Field, Alert } from '@/design-system';
import './LoginPage.css';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = (location.state as LocationState | null)?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your corporate email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(fromPath, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please verify your credentials.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clms-login-canvas">
      <div className="clms-login-card border-hairline">
        {/* Header */}
        <div className="clms-login__header">
          <div className="clms-login__logo-badge" aria-hidden="true">
            <span>HT</span>
          </div>
          <h1 className="clms-login__title">Sign in to CLMS</h1>
          <p className="clms-login__tagline">
            Commercial Lifecycle Management System &bull; Helios Towers
          </p>
        </div>

        {/* Error notification if login fails */}
        {errorMessage && (
          <Alert type="danger" className="clms-login__alert">
            {errorMessage}
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="clms-login__form" noValidate>
          <Field label="Corporate Email" id="email" required>
            <Input
              id="email"
              type="email"
              placeholder="name@heliostowers.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              leftIcon={<Mail size={16} />}
              required
            />
          </Field>

          <Field label="Password" id="password" required>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              leftIcon={<Lock size={16} />}
              required
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="clms-login__submit-btn"
          >
            Sign In
          </Button>
        </form>

        {/* Security Footer Notice */}
        <footer className="clms-login__footer border-hairline">
          <span>Authoritative Commercial Data &bull; Strictly Confidential</span>
        </footer>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Input, Field } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await api.post('/auth/forgot-password', { email: String(fd.get('email')) });
      setSent(true);
    } catch (err: any) {
      toast(err.message || 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a reset link">
      {sent ? (
        <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-3">
          If that email exists, a reset link has been sent. For local development, check the server console for the token.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <Input name="email" type="email" required placeholder="you@company.com" />
          </Field>
          <Button type="submit" className="w-full" disabled={loading} size="md">
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-slate-400">
        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

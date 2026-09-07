import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Input, Field } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const password = String(fd.get('password'));
    if (password !== String(fd.get('confirm'))) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      await api.post('/auth/reset-password', { token, password });
      toast('Password reset successfully', 'success');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}
        <Field label="New password">
          <Input name="password" type="password" required placeholder="At least 8 characters" />
        </Field>
        <Field label="Confirm password">
          <Input name="confirm" type="password" required placeholder="Re-enter password" />
        </Field>
        <Button type="submit" className="w-full" disabled={loading} size="md">
          {loading ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  );
}

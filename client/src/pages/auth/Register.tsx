import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Input, Field } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import AuthLayout from './AuthLayout';

export default function Register() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const password = String(fd.get('password'));
    const confirm = String(fd.get('confirm'));
    if (password !== confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const user = await register(String(fd.get('name')), String(fd.get('email')), password);
      toast(`Welcome, ${user.name}!`, 'success');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start collaborating in minutes">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}
        <Field label="Full name">
          <Input name="name" required placeholder="Sriram" autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" required placeholder="At least 8 characters" autoComplete="new-password" />
        </Field>
        <Field label="Confirm password">
          <Input name="confirm" type="password" required placeholder="Re-enter password" autoComplete="new-password" />
        </Field>
        <Button type="submit" className="w-full" disabled={loading} size="lg">
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

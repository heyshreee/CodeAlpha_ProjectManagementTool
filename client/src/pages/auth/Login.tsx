import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Input, Field } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import AuthLayout from './AuthLayout';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      const user = await login(String(fd.get('email')), String(fd.get('password')));
      toast(`Welcome back, ${user.name}`, 'success');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back to your workspace">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}
        <Field label="Email">
          <Input name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={loading} size="md">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        New here?{' '}
        <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, uploadFile } from '@/lib/api';
import { Input, Textarea, Field } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { toast } from '@/lib/toast';

type Tab = 'profile' | 'security' | 'appearance';

const ACCENTS = [
  { id: 'violet', label: 'Violet', swatch: '#7c5cfc', var: '#7c5cfc' },
  { id: 'blue', label: 'Ocean', swatch: '#3b82f6', var: '#3b82f6' },
  { id: 'emerald', label: 'Mint', swatch: '#10b981', var: '#10b981' },
  { id: 'rose', label: 'Rose', swatch: '#f43f5e', var: '#f43f5e' },
  { id: 'amber', label: 'Amber', swatch: '#f59e0b', var: '#f59e0b' },
  { id: 'cyan', label: 'Cyan', swatch: '#06b6d4', var: '#06b6d4' },
];

function getAccent() {
  return localStorage.getItem('pf-accent') || 'violet';
}

function applyAccent(id: string) {
  localStorage.setItem('pf-accent', id);
  let brand = document.getElementById('pf-brand-sheet') as HTMLStyleElement | null;
  if (!brand) {
    brand = document.createElement('style');
    brand.id = 'pf-brand-sheet';
    document.head.appendChild(brand);
  }
  // Simple per-accent overrides for the most-used brand stops.
  const map: Record<string, Record<string, string>> = {
    violet: { '500': '#7c5cfc', '400': '#9b83ff', '300': '#b6a3ff', '600': '#6947e8', '700': '#5637c4' },
    blue: { '500': '#3b82f6', '400': '#60a5fa', '300': '#93c5fd', '600': '#2563eb', '700': '#1d4ed8' },
    emerald: { '500': '#10b981', '400': '#34d399', '300': '#6ee7b7', '600': '#059669', '700': '#047857' },
    rose: { '500': '#f43f5e', '400': '#fb7185', '300': '#fda4af', '600': '#e11d48', '700': '#be123c' },
    amber: { '500': '#f59e0b', '400': '#fbbf24', '300': '#fcd34d', '600': '#d97706', '700': '#b45309' },
    cyan: { '500': '#06b6d4', '400': '#22d3ee', '300': '#67e8f9', '600': '#0891b2', '700': '#0e7490' },
  };
  const stops = map[id] || map.violet;
  brand.textContent = Object.entries(stops)
    .map(([k, v]) => `:root { --color-brand-${k}: ${v}; }`)
    .join('\n');
}

export default function Settings() {
  const { user, updateProfile } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('profile');
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [accent, setAccent] = useState(getAccent());

  // Re-apply the saved accent whenever it changes (including on mount) so a
  // full page load restores the user's device preference.
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  const chooseAccent = useCallback((id: string) => {
    setAccent(id);
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      await updateProfile({ name, bio });
      toast('Profile updated', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onAvatar(file: File) {
    try {
      const { user: u } = await uploadFile<{ user: any }>('/users/me/avatar', file);
      useAuthStore.setState({ user: u });
      toast('Avatar updated', 'success');
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    }
  }

  async function savePassword() {
    setPwError('');
    if (pw.newPassword !== pw.confirm) {
      setPwError('Passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/users/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      toast('Password changed', 'success');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-slate-100">Settings</h1>

      <section className="bg-surface-2 border border-edge rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Profile</h2>
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} avatar={user?.avatar} size={56} />
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>Change avatar</Button>
          </div>
        </div>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Bio">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell your team about yourself" />
        </Field>
        <div className="flex justify-end">
          <Button onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
        </div>
      </section>

      <section className="bg-surface-2 border border-edge rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Change password</h2>
        {pwError && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{pwError}</div>}
        <Field label="Current password">
          <Input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" />
        </Field>
        <Field label="New password">
          <Input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
        </Field>
        <div className="flex justify-end">
          <Button onClick={savePassword} disabled={pwSaving}>{pwSaving ? 'Updating...' : 'Update password'}</Button>
        </div>
      </section>
    </div>
  );
}

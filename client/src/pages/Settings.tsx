import { useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, uploadFile } from '@/lib/api';
import { Input, Textarea, Field } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { toast } from '@/lib/toast';

export default function Settings() {
  const { user, updateProfile } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

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

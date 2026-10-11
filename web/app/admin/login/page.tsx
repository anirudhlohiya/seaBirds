'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { UiButton } from '../../../components/UiButton';
import { adminLogin } from '../../../lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await adminLogin(email.trim(), password);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5">
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-white p-8 shadow-float text-center">
        <img src="/sea_birds_logo.jpeg" alt="Sea Birds" className="mx-auto h-16 w-16 rounded-full object-cover shadow-sm" />
        <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">Admin</h1>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-[#ffdad6] p-3.5 text-[14px] text-error">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-[13px] font-medium text-ink">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@seabirdstextiles.in"
              className="h-12 w-full rounded-xl border border-hairline bg-white px-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-[13px] font-medium text-ink">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 w-full rounded-xl border border-hairline bg-white px-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
            />
          </div>
          <UiButton type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign In'}
            <Icon name="arrow_forward" className="text-xl" />
          </UiButton>
        </form>
      </div>
    </div>
  );
}

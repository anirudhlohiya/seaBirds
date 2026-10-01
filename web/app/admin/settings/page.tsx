'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../../components/AdminShell';
import { Icon } from '../../../components/Icon';
import { UiButton } from '../../../components/UiButton';
import {
  adminChangePassword,
  adminGetSettings,
  adminUpdateSettings,
} from '../../../lib/api';
import type { Atelier, StoreSettings } from '../../../lib/types';

const inputCls =
  'h-12 w-full rounded-xl border border-hairline bg-white px-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-5" aria-label={title}>
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    adminGetSettings()
      .then(setSettings)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load settings.'));
  }, []);

  const set = <K extends keyof StoreSettings>(key: K, v: StoreSettings[K]) =>
    setSettings((prev) => (prev ? { ...prev, [key]: v } : prev));

  const setAtelier = (index: number, patch: Partial<Atelier>) =>
    setSettings((prev) =>
      prev
        ? { ...prev, ateliers: prev.ateliers.map((a, i) => (i === index ? { ...a, ...patch } : a)) }
        : prev,
    );

  const addAtelier = () =>
    setSettings((prev) =>
      prev
        ? { ...prev, ateliers: [...prev.ateliers, { id: `at-${Date.now()}`, name: '', location: '' }] }
        : prev,
    );

  const removeAtelier = (index: number) =>
    setSettings((prev) =>
      prev ? { ...prev, ateliers: prev.ateliers.filter((_, i) => i !== index) } : prev,
    );

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const updated = await adminUpdateSettings(settings);
      setSettings(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    if (newPw.length < 8) {
      setPwMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg('New passwords do not match.');
      return;
    }
    setPwBusy(true);
    try {
      await adminChangePassword(currentPw, newPw);
      setPwMsg('Password changed successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : 'Password change failed.');
    } finally {
      setPwBusy(false);
    }
  };

  if (!settings && !error) {
    return (
      <AdminShell>
        <p className="text-[14px] text-muted">Loading settings…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="mb-5 text-[26px] font-semibold tracking-tight text-ink">Store Settings</h1>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mb-4 rounded-xl bg-[#e6f4ea] p-4 text-[14px] text-[#0d5c2e]">
          Settings saved.
        </p>
      )}

      {settings && (
        <div className="flex flex-col gap-5">
          <Section title="Business Profile">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business name">
                <input value={settings.business_name} onChange={(e) => set('business_name', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Tagline">
                <input value={settings.tagline} onChange={(e) => set('tagline', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Address">
              <input value={settings.address} onChange={(e) => set('address', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone">
                <input value={settings.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" value={settings.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section title="WhatsApp Hub">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="WhatsApp number">
                <input
                  value={settings.whatsapp_number}
                  onChange={(e) => set('whatsapp_number', e.target.value)}
                  placeholder="+919033415234"
                  className={inputCls}
                />
              </Field>
              <Field label="Advisor name">
                <input value={settings.advisor_name} onChange={(e) => set('advisor_name', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Default WhatsApp message">
              <textarea
                rows={2}
                value={settings.whatsapp_default_message}
                onChange={(e) => set('whatsapp_default_message', e.target.value)}
                className="w-full rounded-xl border border-hairline bg-white p-4 text-[15px] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
              />
            </Field>
          </Section>

          <Section title="Ateliers">
            {settings.ateliers.map((a, i) => (
              <div key={a.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`atelier-name-${i}`}>
                    Atelier name
                  </label>
                  <input
                    id={`atelier-name-${i}`}
                    value={a.name}
                    onChange={(e) => setAtelier(i, { name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`atelier-loc-${i}`}>
                    Location
                  </label>
                  <input
                    id={`atelier-loc-${i}`}
                    value={a.location}
                    onChange={(e) => setAtelier(i, { location: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAtelier(i)}
                  aria-label={`Remove atelier ${a.name || i + 1}`}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-muted hover:text-error"
                >
                  <Icon name="delete" className="text-xl" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAtelier}
              className="inline-flex items-center gap-2 self-start rounded-full border border-hairline px-4 py-2 text-[13px] font-medium text-accent hover:border-accent"
            >
              <Icon name="add" className="text-lg" />
              Add atelier
            </button>
          </Section>

          <UiButton onClick={save} disabled={busy} className="w-full md:w-auto">
            {busy ? 'Saving…' : 'Save Settings'}
          </UiButton>

          <Section title="Security">
            <form onSubmit={changePassword} className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Current password">
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="New password">
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              {pwMsg && (
                <p role="status" className="text-[13px] text-muted">
                  {pwMsg}
                </p>
              )}
              <UiButton type="submit" variant="secondary" disabled={pwBusy} className="self-start">
                {pwBusy ? 'Changing…' : 'Change Password'}
              </UiButton>
            </form>
          </Section>

          <Section title="Data Archives">
            <p className="text-[13px] text-muted">
              Export a snapshot of the catalogue for offline records. Archives are generated from
              the live product data.
            </p>
            <div className="flex flex-wrap gap-3">
              <UiButton variant="secondary" href="/admin/catalogue">
                <Icon name="picture_as_pdf" className="text-xl" />
                Generate Catalogue PDF
              </UiButton>
            </div>
          </Section>
        </div>
      )}
    </AdminShell>
  );
}

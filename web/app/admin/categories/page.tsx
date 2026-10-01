'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../../components/AdminShell';
import { Icon } from '../../../components/Icon';
import { Toggle } from '../../../components/Toggle';
import { UiButton } from '../../../components/UiButton';
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategories,
  adminReorderCategories,
  adminUpdateCategory,
} from '../../../lib/api';
import type { Category } from '../../../lib/types';

interface Draft {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  position: number;
}

const emptyDraft = (position: number): Draft => ({
  name: '',
  slug: '',
  description: '',
  image_url: '',
  position,
});

const inputCls =
  'h-11 w-full rounded-xl border border-hairline bg-white px-3.5 text-[14px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft(1));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft(1));

  const load = () => {
    adminListCategories()
      .then((list) => {
        const sorted = [...list].sort((a, b) => a.position - b.position);
        setCategories(sorted);
        setDraft(emptyDraft(sorted.length + 1));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load categories.'));
  };

  useEffect(load, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(() =>
      adminCreateCategory({
        name: draft.name.trim(),
        slug: draft.slug.trim() || slugify(draft.name),
        description: draft.description.trim(),
        image_url: draft.image_url.trim(),
        position: draft.position,
        is_visible: true,
      }).then(() => {
        setShowNew(false);
      }),
    );

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditDraft({
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: c.image_url,
      position: c.position,
    });
  };

  const saveEdit = (id: string) =>
    run(() =>
      adminUpdateCategory(id, {
        name: editDraft.name.trim(),
        slug: editDraft.slug.trim() || slugify(editDraft.name),
        description: editDraft.description.trim(),
        image_url: editDraft.image_url.trim(),
        position: editDraft.position,
      }).then(() => setEditingId(null)),
    );

  const toggleVisible = (c: Category) =>
    run(() => adminUpdateCategory(c.id, { is_visible: !c.is_visible }));

  const move = (id: string, dir: -1 | 1) =>
    run(async () => {
      const sorted = [...categories].sort((a, b) => a.position - b.position);
      const idx = sorted.findIndex((c) => c.id === id);
      const other = idx + dir;
      if (idx < 0 || other < 0 || other >= sorted.length) return;
      const next = [...sorted];
      [next[idx], next[other]] = [next[other], next[idx]];
      await adminReorderCategories(next.map((c) => c.id));
    });

  const remove = (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"? Products in it stay but lose their grouping.`)) return;
    run(() => adminDeleteCategory(c.id));
  };

  const renderForm = (d: Draft, setD: (d: Draft) => void, onSubmit: () => void, submitLabel: string) => (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-name-${submitLabel}`}>
          Name
        </label>
        <input
          id={`cat-name-${submitLabel}`}
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value, slug: d.slug || slugify(e.target.value) })}
          placeholder="Heritage Sarees & Drapes"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-slug-${submitLabel}`}>
          Slug
        </label>
        <input
          id={`cat-slug-${submitLabel}`}
          value={d.slug}
          onChange={(e) => setD({ ...d, slug: slugify(e.target.value) })}
          placeholder="heritage-sarees"
          className={inputCls}
        />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-desc-${submitLabel}`}>
          Description
        </label>
        <input
          id={`cat-desc-${submitLabel}`}
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
          placeholder="Heirloom handloom sarees…"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-img-${submitLabel}`}>
          Cover image URL
        </label>
        <input
          id={`cat-img-${submitLabel}`}
          type="url"
          value={d.image_url}
          onChange={(e) => setD({ ...d, image_url: e.target.value })}
          placeholder="https://…"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-pos-${submitLabel}`}>
          Position
        </label>
        <input
          id={`cat-pos-${submitLabel}`}
          type="number"
          min={1}
          value={d.position}
          onChange={(e) => setD({ ...d, position: Number(e.target.value) })}
          className={inputCls}
        />
      </div>
      <div className="md:col-span-2">
        <UiButton onClick={onSubmit} disabled={busy || !d.name.trim()}>
          {submitLabel}
        </UiButton>
      </div>
    </div>
  );

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">Categories</h1>
        <UiButton variant="secondary" onClick={() => setShowNew((v) => !v)}>
          <Icon name="add" className="text-xl" />
          New Category
        </UiButton>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
          {error}
        </p>
      )}

      {showNew && (
        <section className="mt-4 rounded-2xl border border-hairline bg-white p-5" aria-label="New category">
          <h2 className="mb-4 text-[16px] font-semibold text-ink">New Category</h2>
          {renderForm(draft, setDraft, create, 'Create Category')}
        </section>
      )}

      <ul className="mt-5 flex flex-col gap-3">
        {categories.map((c) => (
          <li key={c.id} className="rounded-2xl border border-hairline bg-white p-4 shadow-airy">
            {editingId === c.id ? (
              <div>
                <h2 className="mb-4 text-[15px] font-semibold text-ink">Edit Category</h2>
                {renderForm(editDraft, setEditDraft, () => saveEdit(c.id), 'Save Changes')}
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="mt-3 text-[13px] font-medium text-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {c.image_url ? (
                  <img src={c.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-accentWash object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accentWash text-faint">
                    <Icon name="category" className="text-2xl" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accentWash px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                      #{c.position}
                    </span>
                    <p className="truncate text-[15px] font-medium text-ink">{c.name}</p>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-faint">
                    /{c.slug} • {c.product_count} products
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-[13px] text-muted">
                  <Toggle
                    checked={c.is_visible}
                    onChange={() => toggleVisible(c)}
                    label={`Toggle visibility of ${c.name}`}
                  />
                  <span className="hidden sm:inline">Visible</span>
                </label>
                <div className="flex shrink-0 flex-col items-center gap-0.5" aria-label="Reorder">
                  <button
                    type="button"
                    onClick={() => move(c.id, -1)}
                    aria-label={`Move ${c.name} up`}
                    className="flex h-7 w-10 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                  >
                    <Icon name="expand_less" className="text-xl" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(c.id, 1)}
                    aria-label={`Move ${c.name} down`}
                    className="flex h-7 w-10 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                  >
                    <Icon name="expand_more" className="text-xl" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  aria-label={`Edit ${c.name}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                >
                  <Icon name="edit" className="text-xl" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  aria-label={`Delete ${c.name}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[#ffdad6]/60 hover:text-error"
                >
                  <Icon name="delete" className="text-xl" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {categories.length === 0 && (
        <p className="mt-8 text-center text-[14px] text-muted">No categories yet.</p>
      )}
    </AdminShell>
  );
}

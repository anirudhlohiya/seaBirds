'use client';

import { useEffect, useState, useMemo } from 'react';
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
  parent_id: string; // '' for top-level main category
  description: string;
  image_url: string;
  position: number;
}

const emptyDraft = (position: number, parent_id = ''): Draft => ({
  name: '',
  slug: '',
  parent_id,
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
  const [filterView, setFilterView] = useState<'all' | 'main' | 'sub'>('all');

  const mainCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const subcategories = useMemo(() => categories.filter((c) => !!c.parent_id), [categories]);

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
        parent_id: draft.parent_id ? draft.parent_id : null,
        description: draft.description.trim(),
        image_url: draft.image_url.trim(),
        position: draft.position,
        is_visible: true,
      }).then(() => {
        setShowNew(false);
        setDraft(emptyDraft(categories.length + 1));
      }),
    );

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditDraft({
      name: c.name,
      slug: c.slug,
      parent_id: c.parent_id ?? '',
      description: c.description ?? '',
      image_url: c.image_url ?? '',
      position: c.position,
    });
  };

  const saveEdit = (id: string) =>
    run(() =>
      adminUpdateCategory(id, {
        name: editDraft.name.trim(),
        slug: editDraft.slug.trim() || slugify(editDraft.name),
        parent_id: editDraft.parent_id ? editDraft.parent_id : null,
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
    const hasSubs = categories.some((child) => child.parent_id === c.id);
    if (hasSubs) {
      alert(`Cannot delete "${c.name}" because it contains subcategories. Please reassign or delete the subcategories first.`);
      return;
    }
    if (!window.confirm(`Delete category "${c.name}"? Products in it will lose this category reference.`)) return;
    run(() => adminDeleteCategory(c.id));
  };

  const openAddSubcategory = (parentId: string) => {
    const parent = categories.find((c) => c.id === parentId);
    setDraft({
      ...emptyDraft(categories.length + 1, parentId),
      parent_id: parentId,
    });
    setShowNew(true);
  };

  const renderForm = (d: Draft, setD: (d: Draft) => void, onSubmit: () => void, submitLabel: string) => (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-name-${submitLabel}`}>
          Category Name
        </label>
        <input
          id={`cat-name-${submitLabel}`}
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value, slug: d.slug || slugify(e.target.value) })}
          placeholder="e.g. Chanderi Silk or Heritage Sarees"
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-parent-${submitLabel}`}>
          Category Hierarchy
        </label>
        <select
          id={`cat-parent-${submitLabel}`}
          value={d.parent_id}
          onChange={(e) => setD({ ...d, parent_id: e.target.value })}
          className={inputCls}
        >
          <option value="">Top-Level Main Category</option>
          {mainCategories
            .filter((c) => !editingId || c.id !== editingId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                Subcategory under: {c.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-slug-${submitLabel}`}>
          URL Slug
        </label>
        <input
          id={`cat-slug-${submitLabel}`}
          value={d.slug}
          onChange={(e) => setD({ ...d, slug: slugify(e.target.value) })}
          placeholder="chanderi-silk"
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-pos-${submitLabel}`}>
          Display Position
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
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-desc-${submitLabel}`}>
          Description (Optional)
        </label>
        <input
          id={`cat-desc-${submitLabel}`}
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
          placeholder="Short description of this weave or style…"
          className={inputCls}
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-[12px] font-medium text-muted" htmlFor={`cat-img-${submitLabel}`}>
          Cover Image URL (Optional)
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

      <div className="md:col-span-2 flex items-center gap-3 pt-2">
        <UiButton onClick={onSubmit} disabled={busy || !d.name.trim()}>
          {submitLabel}
        </UiButton>
        {submitLabel !== 'Create Category' && (
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="text-[13px] font-medium text-muted hover:text-ink px-3 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">Categories & Subcategories</h1>
          <p className="mt-1 text-[13px] text-muted">
            Organize your catalogue with main categories and nested subcategories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UiButton variant="secondary" onClick={() => { setDraft(emptyDraft(categories.length + 1)); setShowNew((v) => !v); }}>
            <Icon name="add" className="text-xl" />
            New Category
          </UiButton>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
          {error}
        </p>
      )}

      {showNew && (
        <section className="mt-4 rounded-2xl border border-hairline bg-white p-5 shadow-airy" aria-label="New category">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink">
              {draft.parent_id
                ? `New Subcategory under "${categories.find((c) => c.id === draft.parent_id)?.name ?? 'Parent'}"`
                : 'New Main Category'}
            </h2>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="text-[13px] text-muted hover:text-ink"
            >
              Close
            </button>
          </div>
          {renderForm(draft, setDraft, create, 'Create Category')}
        </section>
      )}

      {/* Filter Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-hairline pb-3">
        <button
          type="button"
          onClick={() => setFilterView('all')}
          className={`rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors ${
            filterView === 'all'
              ? 'bg-primary text-white'
              : 'bg-accentWash/60 text-muted hover:bg-accentWash hover:text-accent'
          }`}
        >
          All ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterView('main')}
          className={`rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors ${
            filterView === 'main'
              ? 'bg-primary text-white'
              : 'bg-accentWash/60 text-muted hover:bg-accentWash hover:text-accent'
          }`}
        >
          Main Categories ({mainCategories.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterView('sub')}
          className={`rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors ${
            filterView === 'sub'
              ? 'bg-primary text-white'
              : 'bg-accentWash/60 text-muted hover:bg-accentWash hover:text-accent'
          }`}
        >
          Subcategories ({subcategories.length})
        </button>
      </div>

      {/* Hierarchical Category Tree */}
      <div className="mt-5 flex flex-col gap-4">
        {filterView !== 'sub' &&
          mainCategories.map((mainCat) => {
            const childSubs = categories.filter((c) => c.parent_id === mainCat.id);

            return (
              <div key={mainCat.id} className="rounded-2xl border border-hairline bg-white shadow-airy overflow-hidden">
                {/* Main Category Row */}
                <div className="p-4 bg-white border-b border-hairline/60">
                  {editingId === mainCat.id ? (
                    <div>
                      <h2 className="mb-4 text-[15px] font-semibold text-ink">Edit Main Category</h2>
                      {renderForm(editDraft, setEditDraft, () => saveEdit(mainCat.id), 'Save Changes')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {mainCat.image_url ? (
                        <img src={mainCat.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-accentWash object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accentWash text-accent">
                          <Icon name="folder" className="text-2xl" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-full bg-accentWash px-2 py-0.5 text-[11px] font-semibold text-accent">
                            #{mainCat.position}
                          </span>
                          <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[11px] font-medium text-[#2e7d32]">
                            Main Category
                          </span>
                          <p className="truncate text-[15px] font-semibold text-ink">{mainCat.name}</p>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-faint">
                          /{mainCat.slug} • {childSubs.length} subcategories • {mainCat.product_count} products
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openAddSubcategory(mainCat.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-hairline px-3 py-1.5 text-[12px] font-medium text-accent hover:border-accent hover:bg-accentWash/50"
                        title="Add subcategory under this category"
                      >
                        <Icon name="add" className="text-base" />
                        <span className="hidden sm:inline">Add Subcategory</span>
                      </button>

                      <label className="flex shrink-0 items-center gap-2 text-[13px] text-muted">
                        <Toggle
                          checked={mainCat.is_visible}
                          onChange={() => toggleVisible(mainCat)}
                          label={`Toggle visibility of ${mainCat.name}`}
                        />
                        <span className="hidden md:inline">Visible</span>
                      </label>

                      <div className="flex shrink-0 flex-col items-center gap-0.5" aria-label="Reorder">
                        <button
                          type="button"
                          onClick={() => move(mainCat.id, -1)}
                          aria-label={`Move ${mainCat.name} up`}
                          className="flex h-6 w-8 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                        >
                          <Icon name="expand_less" className="text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(mainCat.id, 1)}
                          aria-label={`Move ${mainCat.name} down`}
                          className="flex h-6 w-8 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                        >
                          <Icon name="expand_more" className="text-lg" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => startEdit(mainCat)}
                        aria-label={`Edit ${mainCat.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                      >
                        <Icon name="edit" className="text-lg" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(mainCat)}
                        aria-label={`Delete ${mainCat.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[#ffdad6]/60 hover:text-error"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Subcategories nested under this Main Category */}
                {childSubs.length > 0 && (
                  <div className="bg-[#f9fbfa] px-4 py-2 divide-y divide-hairline/40">
                    {childSubs.map((sub) => (
                      <div key={sub.id} className="py-2.5 pl-6 sm:pl-10">
                        {editingId === sub.id ? (
                          <div className="py-2">
                            <h3 className="mb-3 text-[14px] font-semibold text-ink">Edit Subcategory</h3>
                            {renderForm(editDraft, setEditDraft, () => saveEdit(sub.id), 'Save Changes')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-muted/40 font-mono text-sm">↳</span>
                            {sub.image_url ? (
                              <img src={sub.image_url} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-accentWash object-cover" />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accentWash text-faint">
                                <Icon name="subdirectory_arrow_right" className="text-lg" />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-accentWash/60 px-2 py-0.5 text-[10px] font-medium text-accent">
                                  Subcategory
                                </span>
                                <p className="truncate text-[14px] font-medium text-ink">{sub.name}</p>
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-faint">
                                /{sub.slug} • {sub.product_count} products
                              </p>
                            </div>

                            <label className="flex shrink-0 items-center gap-2 text-[12px] text-muted">
                              <Toggle
                                checked={sub.is_visible}
                                onChange={() => toggleVisible(sub)}
                                label={`Toggle visibility of ${sub.name}`}
                              />
                              <span className="hidden md:inline">Visible</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => startEdit(sub)}
                              aria-label={`Edit ${sub.name}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                            >
                              <Icon name="edit" className="text-base" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(sub)}
                              aria-label={`Delete ${sub.name}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[#ffdad6]/60 hover:text-error"
                            >
                              <Icon name="delete" className="text-base" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {/* Subcategories view if viewing 'sub' tab specifically */}
        {filterView === 'sub' && (
          <div className="flex flex-col gap-3">
            {subcategories.map((sub) => (
              <div key={sub.id} className="rounded-2xl border border-hairline bg-white p-4 shadow-airy">
                {editingId === sub.id ? (
                  <div>
                    <h3 className="mb-3 text-[14px] font-semibold text-ink">Edit Subcategory</h3>
                    {renderForm(editDraft, setEditDraft, () => saveEdit(sub.id), 'Save Changes')}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {sub.image_url ? (
                      <img src={sub.image_url} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-accentWash object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accentWash text-faint">
                        <Icon name="subdirectory_arrow_right" className="text-xl" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-accentWash px-2 py-0.5 text-[11px] font-medium text-accent">
                          Under: {sub.parent_name ?? 'Main'}
                        </span>
                        <p className="truncate text-[15px] font-medium text-ink">{sub.name}</p>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-faint">
                        /{sub.slug} • {sub.product_count} products
                      </p>
                    </div>

                    <label className="flex shrink-0 items-center gap-2 text-[13px] text-muted">
                      <Toggle
                        checked={sub.is_visible}
                        onChange={() => toggleVisible(sub)}
                        label={`Toggle visibility of ${sub.name}`}
                      />
                      <span className="hidden sm:inline">Visible</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => startEdit(sub)}
                      aria-label={`Edit ${sub.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                    >
                      <Icon name="edit" className="text-lg" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(sub)}
                      aria-label={`Delete ${sub.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[#ffdad6]/60 hover:text-error"
                    >
                      <Icon name="delete" className="text-lg" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {categories.length === 0 && (
        <div className="mt-12 rounded-2xl border border-hairline bg-white p-10 text-center">
          <Icon name="category" className="text-4xl text-faint" />
          <p className="mt-2 text-[16px] font-medium text-ink">No categories created yet</p>
          <p className="mt-1 text-[13px] text-muted">
            Create your first main category, and then add subcategories beneath it.
          </p>
        </div>
      )}
    </AdminShell>
  );
}

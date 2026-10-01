'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../../../components/AdminShell';
import { adminGetProduct, adminListCategories, adminUpdateProduct } from '../../../../lib/api';
import type { Category, Product } from '../../../../lib/types';
import { ProductForm, type ProductFormValue } from '../ProductForm';

export function EditProduct({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetProduct(id)
      .then(setProduct)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load product.'));
    adminListCategories().then(setCategories).catch(() => undefined);
  }, [id]);

  if (error) {
    return (
      <AdminShell>
        <p role="alert" className="rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
          {error}
        </p>
      </AdminShell>
    );
  }
  if (!product) {
    return (
      <AdminShell>
        <p className="text-[14px] text-muted">Loading product…</p>
      </AdminShell>
    );
  }

  const initial: ProductFormValue = { ...product, images: product.images.map((i) => ({ ...i })) };

  return (
    <AdminShell>
      <h1 className="mb-5 text-[26px] font-semibold tracking-tight text-ink">Edit Product</h1>
      <ProductForm
        initial={initial}
        categories={categories}
        submitLabel="Save Changes"
        onSave={(value) => adminUpdateProduct(id, value).then(() => undefined)}
      />
    </AdminShell>
  );
}

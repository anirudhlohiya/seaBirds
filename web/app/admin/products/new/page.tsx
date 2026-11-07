'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../../../components/AdminShell';
import { adminCreateProduct, adminListCategories, adminNextSku } from '../../../../lib/api';
import type { Category } from '../../../../lib/types';
import { ProductForm, type ProductFormValue } from '../ProductForm';

const EMPTY: ProductFormValue = {
  name: '',
  tagline: '',
  slug: '',
  sku: '',
  category_id: '',
  category_slug: '',
  category_name: '',
  subcategory_id: '',
  subcategory_slug: '',
  subcategory_name: '',
  price: 0,
  mrp: 0,
  unit: 'piece',
  stock_qty: 1,
  stock_status: 'in_stock',
  is_new: false,
  is_bestseller: false,
  is_visible: true,
  whatsapp_enabled: true,
  images: [],
};

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [initial, setInitial] = useState<ProductFormValue | null>(null);

  useEffect(() => {
    // Either request may fail; the form still opens (the API assigns a SKU if it is left blank).
    Promise.allSettled([adminListCategories(), adminNextSku()]).then(([cats, sku]) => {
      const list = cats.status === 'fulfilled' ? cats.value : [];
      const first = list.find((c) => !c.parent_id);
      setCategories(list);
      setInitial({
        ...EMPTY,
        sku: sku.status === 'fulfilled' ? sku.value : '',
        ...(first ? { category_id: first.id, category_slug: first.slug, category_name: first.name } : {}),
      });
    });
  }, []);

  return (
    <AdminShell>
      <h1 className="mb-5 text-[26px] font-semibold tracking-tight text-ink">Add Product</h1>
      {initial ? (
        <ProductForm
          initial={initial}
          categories={categories}
          submitLabel="Create Product"
          onSave={(value) => adminCreateProduct(value).then(() => undefined)}
        />
      ) : (
        <p className="text-[14px] text-muted">Loading…</p>
      )}
    </AdminShell>
  );
}

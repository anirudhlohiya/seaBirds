'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../../../components/AdminShell';
import { adminCreateProduct, adminListCategories } from '../../../../lib/api';
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
  price: 0,
  mrp: 0,
  unit: 'piece',
  stock_qty: 0,
  stock_status: 'in_stock',
  is_new: false,
  is_bestseller: false,
  is_visible: true,
  whatsapp_enabled: true,
  images: [],
  yarn_label: '',
  fabric_composition: '',
  weave: '',
  dimensions: '',
  care: '',
  certifications: '',
  origin: '',
  artisan_quote: '',
  artisan_name: '',
  artisan_place: '',
  description: '',
};

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    adminListCategories().then(setCategories).catch(() => undefined);
  }, []);

  return (
    <AdminShell>
      <h1 className="mb-5 text-[26px] font-semibold tracking-tight text-ink">Add Product</h1>
      <ProductForm
        initial={EMPTY}
        categories={categories}
        submitLabel="Create Product"
        onSave={(value) => adminCreateProduct(value).then(() => undefined)}
      />
    </AdminShell>
  );
}

import { MOCK_PRODUCTS } from '../../../../lib/mock';
import { EditProduct } from './edit';

export function generateStaticParams() {
  const numericIds = Array.from({ length: 500 }, (_, i) => ({ id: String(i + 1) }));
  const mockIds = MOCK_PRODUCTS.map((p) => ({ id: p.id }));
  return [...numericIds, ...mockIds];
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  return <EditProduct id={params.id} />;
}

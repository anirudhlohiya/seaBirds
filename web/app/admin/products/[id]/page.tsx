import { MOCK_PRODUCTS } from '../../../../lib/mock';
import { EditProduct } from './edit';

export function generateStaticParams() {
  return MOCK_PRODUCTS.map((p) => ({ id: p.id }));
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  return <EditProduct id={params.id} />;
}

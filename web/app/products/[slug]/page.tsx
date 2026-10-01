import { MOCK_PRODUCTS } from '../../../lib/mock';
import { ProductDetail } from './detail';

export function generateStaticParams() {
  return MOCK_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  return <ProductDetail slug={params.slug} />;
}

import { getProducts } from '../../../lib/api';
import { ProductDetail } from './detail';

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  return <ProductDetail slug={params.slug} />;
}

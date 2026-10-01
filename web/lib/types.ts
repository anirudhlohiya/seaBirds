export interface ProductImage {
  id: string;
  url: string;
  alt_text: string;
  position: number;
}

export type StockStatus = 'in_stock' | 'low' | 'made_to_order' | 'out_of_stock';
export type PriceUnit = 'piece' | 'meter';

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  tagline: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  price: number;
  mrp: number;
  unit: PriceUnit;
  stock_qty: number;
  stock_status: StockStatus;
  is_new: boolean;
  is_bestseller: boolean;
  is_visible: boolean;
  /** "Enable for WhatsApp Concierge" — controls the product's enquiry CTA. */
  whatsapp_enabled: boolean;
  images: ProductImage[];
  yarn_label: string;
  fabric_composition: string;
  weave: string;
  dimensions: string;
  care: string;
  certifications: string;
  origin: string;
  artisan_quote: string;
  artisan_name: string;
  artisan_place: string;
  description: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  position: number;
  is_visible: boolean;
  product_count: number;
}

export interface Atelier {
  id: string;
  name: string;
  location: string;
}

export interface StoreSettings {
  business_name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  advisor_name: string;
  whatsapp_default_message: string;
  ateliers: Atelier[];
}

export interface CatalogueEdition {
  id: string;
  title: string;
  volume: string;
  description: string;
  scope: string;
  file_url: string;
  file_size_mb: number;
  cover_image_url: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export interface DashboardStats {
  total_products: number;
  total_categories: number;
  new_arrivals: number;
  bestsellers: number;
}

export interface EnquiryLine {
  product_id: string;
  qty: number;
}

export interface ProductQuery {
  category?: string;
  search?: string;
  tag?: 'new' | 'bestseller';
  stock?: 'in_stock' | 'low' | 'made_to_order' | 'out_of_stock';
}

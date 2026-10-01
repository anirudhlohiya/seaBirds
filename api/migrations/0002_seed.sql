-- Sea Birds Luxury Textiles — 0002 seed data
--
-- PLACEHOLDERS TO REPLACE BEFORE LAUNCH:
--   1. Image URLs use https://images.example.com/placeholder/... — replace
--      with real R2/product image URLs.
--   2. The admin password_hash below is NOT a valid login. See the comment
--      above the admin_users INSERT for the seeding flow.
--   3. catalogue_editions rows use file_url '#' — they are replaced the first
--      time an admin generates + uploads a real PDF via
--      POST /api/admin/catalogue/upload (upserted by scope).
--   4. The admin email is a placeholder; update it to the real address.

-- ---------------------------------------------------------- categories
INSERT INTO categories (name, slug, image_url, position, visible_in_menu) VALUES
  ('Heritage Sarees & Drapes', 'heritage-sarees', 'https://images.example.com/placeholder/categories/heritage-sarees.jpg', 1, 1),
  ('Pure Silk Yardage', 'silk-yardage', 'https://images.example.com/placeholder/categories/silk-yardage.jpg', 2, 1),
  ('Artisanal Cotton & Dabu', 'artisanal-cotton', 'https://images.example.com/placeholder/categories/artisanal-cotton.jpg', 3, 1),
  ('Linen & Blends', 'linen-blends', 'https://images.example.com/placeholder/categories/linen-blends.jpg', 4, 1),
  ('Dupattas & Stoles', 'dupattas-stoles', 'https://images.example.com/placeholder/categories/dupattas-stoles.jpg', 5, 1),
  ('Bridal Weaves & Katan', 'bridal-katan', 'https://images.example.com/placeholder/categories/bridal-katan.jpg', 6, 1);

-- ------------------------------------------------------ store settings
INSERT INTO store_settings (id, business_name, tagline, logo_url, whatsapp_number, advisor_name, greeting, ateliers) VALUES
  (1,
   'Sea Birds Luxury Textiles',
   'Handwoven luxury, delivered with care',
   NULL,
   '+919820144520',
   'Sea Birds Advisor',
   'Namaste! Looking for something special in handwoven textiles?',
   '[{"name":"Flagship Atelier","city":"Mumbai","note":"PLACEHOLDER — replace with real atelier details"}]');

-- ------------------------------------------------- catalogue editions
-- PLACEHOLDER rows: file_url '#' is replaced on the first real admin upload
-- (upserted by scope). Delete these rows instead if you prefer to start empty.
INSERT INTO catalogue_editions (title, volume, scope, file_url, file_size_mb, updated_at) VALUES
  ('The Master Catalogue', 'Vol. I', 'master', '#', NULL, '2026-01-01 00:00:00'),
  ('Category Lookbook', 'Vol. I', 'category', '#', NULL, '2026-01-01 00:00:00'),
  ('New Arrivals', 'Vol. I', 'new-arrivals', '#', NULL, '2026-01-01 00:00:00');

-- ---------------------------------------------------------- admin user
-- >>> REPLACE THIS HASH BEFORE FIRST DEPLOY — IT IS NOT A VALID LOGIN <<<
-- Generate a real hash on your own machine (never commit the result):
--   node scripts/hash-password.mjs 'your-strong-password'
-- Then either replace the value below BEFORE running this migration, or
-- update the row afterwards:
--   UPDATE admin_users SET password_hash = 'pbkdf2$100000$...' WHERE email = 'admin@example.com';
-- Also update the placeholder email to the real admin address.
INSERT INTO admin_users (email, password_hash, role) VALUES
  ('admin@example.com', 'PENDING_SEED__RUN_SCRIPTS_HASH_PASSWORD', 'admin');

-- ------------------------------------------------------------ products
-- Sample catalogue (8 products). Prices in rupees. Image URLs are placeholders.
INSERT INTO products
  (slug, name, sku, category_id, fabric_composition, weave_detail, dimensions, care,
   certifications, price, mrp, unit, stock_qty, low_stock_threshold,
   is_new, is_bestseller, whatsapp_enabled, is_visible,
   tagline, origin, description, artisan_name, artisan_place, artisan_quote, made_to_order,
   created_at, updated_at)
VALUES
  ('banarasi-silk-saree-meenakari', 'Banarasi Silk Saree — Meenakari Jaal', 'SB-SAR-001',
   (SELECT id FROM categories WHERE slug = 'heritage-sarees'),
   '100% pure mulberry silk with gold zari', 'Handloom kadhua weave, meenakari jaal',
   '6.3 m × 1.12 m (with blouse piece)', 'Dry clean only',
   '["Silk Mark", "Handloom Mark"]',
   24999, 29999, 'pieces', 12, 3, 1, 1, 1, 1, '', '', '', '', '', '', 0, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
  ('kanjeevaram-temple-border-saree', 'Kanjeevaram Temple Border Saree', 'SB-SAR-002',
   (SELECT id FROM categories WHERE slug = 'heritage-sarees'),
   '100% pure mulberry silk', 'Handloom korvai weave, temple border',
   '6.2 m × 1.15 m (with blouse piece)', 'Dry clean only',
   '["Silk Mark"]',
   32999, NULL, 'pieces', 8, 2, 0, 1, 1, 1, '', '', '', '', '', '', 0, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
  ('chanderi-silk-yardage', 'Chanderi Silk Yardage', 'SB-YRD-001',
   (SELECT id FROM categories WHERE slug = 'silk-yardage'),
   'Silk-cotton blend (70/30)', 'Handloom sheer weave',
   'Width 1.14 m, sold per metre', 'Gentle hand wash',
   '["Handloom Mark"]',
   1899, 2299, 'meters', 60, 10, 1, 0, 1, 1, '', '', '', '', '', '', 0, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
  ('tussar-silk-yardage-natural', 'Tussar Silk Yardage — Natural', 'SB-YRD-002',
   (SELECT id FROM categories WHERE slug = 'silk-yardage'),
   '100% tussar (wild) silk', 'Handloom plain weave, slub texture',
   'Width 1.10 m, sold per metre', 'Dry clean recommended',
   '["Silk Mark"]',
   2499, NULL, 'meters', 45, 10, 0, 0, 1, 1, '', '', '', '', '', '', 0, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
  ('dabu-block-print-cotton', 'Dabu Block-Print Cotton', 'SB-CTN-001',
   (SELECT id FROM categories WHERE slug = 'artisanal-cotton'),
   '100% long-staple cotton', 'Hand block print, natural dabu resist dye',
   'Width 1.12 m, sold per metre', 'Machine wash cold, mild detergent',
   '["Handloom Mark"]',
   899, 1099, 'meters', 120, 20, 1, 0, 1, 1, '', '', '', '', '', '', 0, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
  ('european-flax-linen', 'European Flax Linen', 'SB-LIN-001',
   (SELECT id FROM categories WHERE slug = 'linen-blends'),
   '100% European flax linen', 'Handloom plain weave, garment washed',
   'Width 1.50 m, sold per metre', 'Machine wash gentle',
   '["European Flax"]',
   1599, 1899, 'meters', 80, 15, 0, 0, 1, 1, '', '', '', '', '', '', 0, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
  ('phulkari-dupatta', 'Phulkari Embroidered Dupatta', 'SB-DUP-001',
   (SELECT id FROM categories WHERE slug = 'dupattas-stoles'),
   'Pure cotton base, silk-floss embroidery', 'Hand-embroidered phulkari',
   '2.4 m × 0.95 m', 'Dry clean only',
   NULL,
   4999, 5999, 'pieces', 15, 4, 0, 1, 1, 1, '', '', '', '', '', '', 0, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
  ('bridal-katan-silk-saree', 'Bridal Katan Silk Saree — Jangla', 'SB-BRD-001',
   (SELECT id FROM categories WHERE slug = 'bridal-katan'),
   '100% katan silk with gold zari', 'Handloom jangla weave',
   '6.5 m × 1.15 m (with blouse piece)', 'Dry clean only',
   '["Silk Mark", "Handloom Mark"]',
   45999, 52999, 'pieces', 5, 2, 1, 1, 1, 1, '', '', '', '', '', '', 0, '2026-09-15 10:00:00', '2026-09-15 10:00:00');

-- ----------------------------------------------------- product images
-- PLACEHOLDER URLs — replace with real imagery before launch.
INSERT INTO product_images (product_id, url, thumb_url, alt, position, is_cover) VALUES
  ((SELECT id FROM products WHERE slug = 'banarasi-silk-saree-meenakari'), 'https://images.example.com/placeholder/products/banarasi-meenakari-1.jpg', 'https://images.example.com/placeholder/products/banarasi-meenakari-1-thumb.jpg', 'Banarasi silk saree with meenakari jaal, front view', 1, 1),
  ((SELECT id FROM products WHERE slug = 'banarasi-silk-saree-meenakari'), 'https://images.example.com/placeholder/products/banarasi-meenakari-2.jpg', 'https://images.example.com/placeholder/products/banarasi-meenakari-2-thumb.jpg', 'Banarasi silk saree, border detail', 2, 0),
  ((SELECT id FROM products WHERE slug = 'kanjeevaram-temple-border-saree'), 'https://images.example.com/placeholder/products/kanjeevaram-temple-1.jpg', 'https://images.example.com/placeholder/products/kanjeevaram-temple-1-thumb.jpg', 'Kanjeevaram saree with temple border', 1, 1),
  ((SELECT id FROM products WHERE slug = 'chanderi-silk-yardage'), 'https://images.example.com/placeholder/products/chanderi-yardage-1.jpg', 'https://images.example.com/placeholder/products/chanderi-yardage-1-thumb.jpg', 'Chanderi silk yardage, draped', 1, 1),
  ((SELECT id FROM products WHERE slug = 'tussar-silk-yardage-natural'), 'https://images.example.com/placeholder/products/tussar-yardage-1.jpg', 'https://images.example.com/placeholder/products/tussar-yardage-1-thumb.jpg', 'Natural tussar silk yardage', 1, 1),
  ((SELECT id FROM products WHERE slug = 'dabu-block-print-cotton'), 'https://images.example.com/placeholder/products/dabu-cotton-1.jpg', 'https://images.example.com/placeholder/products/dabu-cotton-1-thumb.jpg', 'Dabu block-print cotton fabric', 1, 1),
  ((SELECT id FROM products WHERE slug = 'dabu-block-print-cotton'), 'https://images.example.com/placeholder/products/dabu-cotton-2.jpg', 'https://images.example.com/placeholder/products/dabu-cotton-2-thumb.jpg', 'Dabu print, close-up of motifs', 2, 0),
  ((SELECT id FROM products WHERE slug = 'european-flax-linen'), 'https://images.example.com/placeholder/products/flax-linen-1.jpg', 'https://images.example.com/placeholder/products/flax-linen-1-thumb.jpg', 'European flax linen fabric', 1, 1),
  ((SELECT id FROM products WHERE slug = 'phulkari-dupatta'), 'https://images.example.com/placeholder/products/phulkari-dupatta-1.jpg', 'https://images.example.com/placeholder/products/phulkari-dupatta-1-thumb.jpg', 'Phulkari embroidered dupatta', 1, 1),
  ((SELECT id FROM products WHERE slug = 'bridal-katan-silk-saree'), 'https://images.example.com/placeholder/products/bridal-katan-1.jpg', 'https://images.example.com/placeholder/products/bridal-katan-1-thumb.jpg', 'Bridal katan silk saree with jangla weave', 1, 1),
  ((SELECT id FROM products WHERE slug = 'bridal-katan-silk-saree'), 'https://images.example.com/placeholder/products/bridal-katan-2.jpg', 'https://images.example.com/placeholder/products/bridal-katan-2-thumb.jpg', 'Bridal katan saree, pallu detail', 2, 0);

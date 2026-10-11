-- Sea Birds Luxury Textiles — 0003 subcategories support
-- Adds parent_id to categories (enabling hierarchical subcategories)
-- and subcategory_id to products.

ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN subcategory_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory_id);

-- Seed initial categories and subcategories
INSERT INTO categories (id, name, slug, parent_id, image_url, position, visible_in_menu) VALUES
  (1, 'Heritage Sarees & Drapes', 'heritage-sarees', NULL, '/images/products/sea-mist.svg', 1, 1),
  (2, 'Pure Silk Yardage', 'silk-yardage', NULL, '/images/products/pastel-mint-organza.svg', 2, 1),
  (3, 'Artisanal Cotton & Dabu', 'artisanal-cotton', NULL, '/images/products/indigo-dabu.svg', 3, 1),
  (4, 'Linen & Blends', 'linen-blends', NULL, '/images/products/desert-sand-linen.svg', 4, 1),
  (5, 'Dupattas & Stoles', 'dupattas-stoles', NULL, '/images/products/ivory-tissue.svg', 5, 1),
  (6, 'Bridal Weaves & Katan', 'bridal-katan', NULL, '/images/products/vintage-gold-katan.svg', 6, 1);

-- Subcategories for Heritage Sarees (parent_id = 1)
INSERT INTO categories (id, name, slug, parent_id, image_url, position, visible_in_menu) VALUES
  (101, 'Chanderi Silk Sarees', 'chanderi-silk-sarees', 1, '/images/products/sea-mist.svg', 1, 1),
  (102, 'Jamdani Weaves', 'jamdani-weaves', 1, '/images/products/royal-indigo.svg', 2, 1),
  (103, 'Raw Tussar & Temple Border', 'tussar-temple-border', 1, '/images/products/raw-tussar.svg', 3, 1);

-- Subcategories for Pure Silk Yardage (parent_id = 2)
INSERT INTO categories (id, name, slug, parent_id, image_url, position, visible_in_menu) VALUES
  (201, 'Mulberry Silk', 'mulberry-silk', 2, '/images/products/pastel-mint-organza.svg', 1, 1),
  (202, 'Organza & Tissue Yardage', 'organza-tissue-yardage', 2, '/images/products/pastel-mint-organza.svg', 2, 1);

-- Subcategories for Artisanal Cotton (parent_id = 3)
INSERT INTO categories (id, name, slug, parent_id, image_url, position, visible_in_menu) VALUES
  (301, 'Dabu Mud Resist', 'dabu-mud-resist', 3, '/images/products/indigo-dabu.svg', 1, 1),
  (302, 'Hand Block Prints', 'hand-block-prints', 3, '/images/products/indigo-dabu.svg', 2, 1);

-- Subcategories for Linen & Blends (parent_id = 4)
INSERT INTO categories (id, name, slug, parent_id, image_url, position, visible_in_menu) VALUES
  (401, 'Pure Handloom Linen', 'pure-handloom-linen', 4, '/images/products/desert-sand-linen.svg', 1, 1),
  (402, 'Linen-Silk Blends', 'linen-silk-blends', 4, '/images/products/desert-sand-linen.svg', 2, 1);

-- Subcategories for Dupattas & Stoles (parent_id = 5)
INSERT INTO categories (id, name, slug, parent_id, image_url, position, visible_in_menu) VALUES
  (501, 'Sheer Tissue Dupattas', 'sheer-tissue-dupattas', 5, '/images/products/ivory-tissue.svg', 1, 1),
  (502, 'Hand-embroidered Stoles', 'hand-embroidered-stoles', 5, '/images/products/ivory-tissue.svg', 2, 1);

-- Subcategories for Bridal Weaves (parent_id = 6)
INSERT INTO categories (id, name, slug, parent_id, image_url, position, visible_in_menu) VALUES
  (601, 'Banarasi Katan Silk', 'banarasi-katan-silk', 6, '/images/products/vintage-gold-katan.svg', 1, 1),
  (602, 'Heirloom Zari Brocades', 'heirloom-zari-brocades', 6, '/images/products/vintage-gold-katan.svg', 2, 1);

-- Sea Birds Luxury Textiles — 0002 seed data
--
-- PLACEHOLDERS TO REPLACE BEFORE LAUNCH:
--   1. The admin password_hash below is NOT a valid login. See the comment
--      above the admin_users INSERT for the seeding flow.
--   2. The admin email is a placeholder; update it to the real address.

-- ------------------------------------------------------ store settings
INSERT INTO store_settings (id, business_name, tagline, logo_url, whatsapp_number, advisor_name, greeting, ateliers) VALUES
  (1,
   'Sea Birds Luxury Textiles',
   'Handwoven luxury, delivered with care',
   NULL,
   '+919033415234',
   'Sea Birds',
   'Namaste! Looking for something special in handwoven textiles?',
   '[{"name":"Flagship Atelier","city":"Mumbai","note":"PLACEHOLDER — replace with real atelier details"}]');

-- ---------------------------------------------------------- admin user
-- >>> REPLACE THIS HASH BEFORE FIRST DEPLOY — IT IS NOT A VALID LOGIN <<<
-- Generate a real hash on your own machine (never commit the result):
--   node scripts/hash-password.mjs 'your-strong-password'
-- Then either replace the value below BEFORE running this migration, or
-- update the row afterwards:
--   UPDATE admin_users SET password_hash = 'pbkdf2$100000$...' WHERE email = 'admin@example.com';
-- Also update the placeholder email to the real admin address.
INSERT INTO admin_users (email, password_hash, role) VALUES
  ('admin@seabirds.in', 'pbkdf2$100000$0RZMDeFVjef8bZBes5nXaeI_gmU7NjQ_2h_RHIkP2z0$VVQkXXr9hBNcGuEDDTcQhvIMIBMb-1_Uj73tJt2Ll1M', 'admin');

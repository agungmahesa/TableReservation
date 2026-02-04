CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  location TEXT CHECK(location IN ('Indoor', 'Outdoor')) NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'Available',
  is_joinable INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  table_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  special_requests TEXT,
  seating_preference TEXT,
  status TEXT DEFAULT 'Confirmed',
  deposit_required INTEGER DEFAULT 0,
  deposit_paid INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id)
);

CREATE TABLE IF NOT EXISTS reservation_assignments (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL,
  table_id INTEGER NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY (table_id) REFERENCES tables(id)
);

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price INTEGER NOT NULL,
  image_url TEXT,
  category TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'Staff'
);

-- Seed initial tables if empty
INSERT INTO tables (id, name, capacity, location, type, is_joinable) VALUES
(1, 'Table 1', 2, 'Indoor', 'Standard', 1),
(2, 'Table 2', 2, 'Indoor', 'Standard', 1),
(3, 'Table 3', 4, 'Indoor', 'Standard', 1),
(4, 'Table 4', 4, 'Indoor', 'Standard', 1),
(5, 'Window 1', 4, 'Indoor', 'Booth', 0),
(6, 'Patio 1', 2, 'Outdoor', 'Standard', 1),
(7, 'Patio 2', 4, 'Outdoor', 'Standard', 1),
(8, 'Grand VIP Table', 10, 'Indoor', 'VIP', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (name, description, price, image_url, category) VALUES
('A5 Wagyu Ribeye', 'Japanese A5 Wagyu, charcoal grilled to your preference, served with truffle mash and beef jus.', 850000, 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2569&auto=format&fit=crop', 'Main'),
('Pan-Seared Scallops', 'Hokkaido scallops with cauliflower purée, caviar, and herb oil.', 320000, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?q=80&w=2670&auto=format&fit=crop', 'Starter'),
('Lobster Thermidor', 'Whole lobster baked with cognac cream sauce and gruyère cheese.', 750000, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop', 'Main')
ON CONFLICT (name) DO NOTHING;

INSERT INTO settings (key, value) VALUES
('hero_title', '"Exquisite Taste,"'),
('hero_highlight', '"Unforgettable Moments"'),
('hero_subtitle', '"Experience the finest culinary journey in a modern, elegant setting."'),
('deposit_config', '{"threshold":5,"amount":100000,"bank_info":"BCA 1234567890 a/n Lumina Dining"}')
ON CONFLICT (key) DO NOTHING;

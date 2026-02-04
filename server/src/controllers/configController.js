const db = require('../db');

exports.getSettings = (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM settings').all();
        const settings = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

exports.updateSettings = (req, res) => {
    try {
        const updates = req.body;
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        const transaction = db.transaction((data) => {
            for (const [key, value] of Object.entries(data)) {
                const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                stmt.run(key, valStr);
            }
        });
        transaction(updates);
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

exports.getMenu = (req, res) => {
    try {
        const menu = db.prepare('SELECT * FROM menu_items WHERE is_active = 1').all();
        res.json(menu);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
};

exports.getAllMenuAdmin = (req, res) => {
    try {
        const menu = db.prepare('SELECT * FROM menu_items').all();
        res.json(menu);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
};

exports.addMenuItem = (req, res) => {
    try {
        const { name, description, image_url, price, category } = req.body;

        // Check for duplicate name
        const existing = db.prepare('SELECT id FROM menu_items WHERE LOWER(name) = LOWER(?)').get(name);
        if (existing) {
            return res.status(400).json({ error: 'A menu item with this name already exists' });
        }

        const stmt = db.prepare('INSERT INTO menu_items (name, description, image_url, price, category) VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(name, description, image_url, price, category);
        res.status(201).json({ id: info.lastInsertRowid, message: 'Menu item added' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add menu item' });
    }
};

exports.updateMenuItem = (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image_url, price, category, is_active } = req.body;

        // Check for duplicate name (excluding current item)
        const existing = db.prepare('SELECT id FROM menu_items WHERE LOWER(name) = LOWER(?) AND id != ?').get(name, id);
        if (existing) {
            return res.status(400).json({ error: 'A menu item with this name already exists' });
        }

        const stmt = db.prepare('UPDATE menu_items SET name = ?, description = ?, image_url = ?, price = ?, category = ?, is_active = ? WHERE id = ?');
        stmt.run(name, description, image_url, price, category, is_active ? 1 : 0, id);
        res.json({ message: 'Menu item updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update menu item' });
    }
};

exports.deleteMenuItem = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
};

const db = require('../db');

exports.getSettings = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const updates = req.body;
        // In PG, we can use a single multi-row insert with ON CONFLICT
        // But for simplicity and maintaining the existing logic loop:
        await db.query('BEGIN');
        for (const [key, value] of Object.entries(updates)) {
            const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            await db.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP',
                [key, valStr]
            );
        }
        await db.query('COMMIT');
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

exports.getMenu = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM menu_items WHERE is_active = 1');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
};

exports.getAllMenuAdmin = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM menu_items');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
};

exports.addMenuItem = async (req, res) => {
    try {
        const { name, description, image_url, price, category } = req.body;

        // Check for duplicate name
        const existing = await db.query('SELECT id FROM menu_items WHERE LOWER(name) = LOWER($1)', [name]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'A menu item with this name already exists' });
        }

        const result = await db.query(
            'INSERT INTO menu_items (name, description, image_url, price, category) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, description, image_url, price, category]
        );
        res.status(201).json({ id: result.rows[0].id, message: 'Menu item added' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add menu item' });
    }
};

exports.updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image_url, price, category, is_active } = req.body;

        // Check for duplicate name (excluding current item)
        const existing = await db.query('SELECT id FROM menu_items WHERE LOWER(name) = LOWER($1) AND id != $2', [name, id]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'A menu item with this name already exists' });
        }

        await db.query(
            'UPDATE menu_items SET name = $1, description = $2, image_url = $3, price = $4, category = $5, is_active = $6 WHERE id = $7',
            [name, description, image_url, price, category, is_active ? 1 : 0, id]
        );
        res.json({ message: 'Menu item updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
};

exports.deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM menu_items WHERE id = $1', [id]);
        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
};

const db = require('../db');

exports.getAllTables = (req, res) => {
    try {
        const tables = db.prepare('SELECT * FROM tables').all();
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.addTable = (req, res) => {
    try {
        const { name, capacity, location, type, is_joinable } = req.body;
        const stmt = db.prepare('INSERT INTO tables (name, capacity, location, type, is_joinable) VALUES (?, ?, ?, ?, ?)');
        const joinable = is_joinable !== undefined ? (is_joinable ? 1 : 0) : 1; // Default to joinable
        const info = stmt.run(name, capacity, location, type, joinable);
        res.status(201).json({ id: info.lastInsertRowid, message: 'Table added' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateTable = (req, res) => {
    try {
        const { name, capacity, location, status, is_joinable } = req.body;
        let query = 'UPDATE tables SET name = ?, capacity = ?, location = ?, status = ?';
        const params = [name, capacity, location, status];

        if (is_joinable !== undefined) {
            query += ', is_joinable = ?';
            params.push(is_joinable ? 1 : 0);
        }

        query += ' WHERE id = ?';
        params.push(req.params.id);

        const stmt = db.prepare(query);
        const info = stmt.run(...params);
        if (info.changes === 0) return res.status(404).json({ error: 'Table not found' });
        res.json({ message: 'Table updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteTable = (req, res) => {
    try {
        // Check if there are active reservations for this table
        const activeRes = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE table_id = ? AND status IN ('Confirmed', 'Pending Payment')").get(req.params.id);

        if (activeRes.count > 0) {
            return res.status(400).json({ error: 'Cannot delete table with active reservations. Please cancel or move them first.' });
        }

        const stmt = db.prepare('DELETE FROM tables WHERE id = ?');
        const info = stmt.run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ error: 'Table not found' });
        res.json({ message: 'Table deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

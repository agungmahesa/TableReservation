const db = require('../db');

exports.getAllTables = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tables');
        res.json(result.rows);
    } catch (error) {
        console.error('Get All Tables Error:', error);
        res.status(500).json({ error: 'Failed to fetch tables: ' + error.message });
    }
};

exports.addTable = async (req, res) => {
    try {
        const { name, capacity, location, type, is_joinable } = req.body;
        const joinable = is_joinable !== undefined ? (is_joinable ? 1 : 0) : 1; // Default to joinable
        const result = await db.query(
            'INSERT INTO tables (name, capacity, location, type, is_joinable) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, capacity, location, type, joinable]
        );
        res.status(201).json({ id: result.rows[0].id, message: 'Table added' });
    } catch (error) {
        console.error('Add Table Error:', error);
        res.status(500).json({ error: 'Failed to save table: ' + error.message });
    }
};

exports.updateTable = async (req, res) => {
    try {
        const { name, capacity, location, status, is_joinable } = req.body;
        let query = 'UPDATE tables SET name = $1, capacity = $2, location = $3, status = $4';
        const params = [name, capacity, location, status];

        if (is_joinable !== undefined) {
            query += ', is_joinable = $5';
            params.push(is_joinable ? 1 : 0);
        }

        query += ` WHERE id = $${params.length + 1}`;
        params.push(req.params.id);

        const result = await db.query(query, params);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Table not found' });
        res.json({ message: 'Table updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteTable = async (req, res) => {
    try {
        // Check if there are active reservations for this table
        const activeResResult = await db.query(
            "SELECT COUNT(*) as count FROM reservations WHERE table_id = $1 AND status IN ('Confirmed', 'Pending Payment')",
            [req.params.id]
        );

        if (parseInt(activeResResult.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot delete table with active reservations. Please cancel or move them first.' });
        }

        const result = await db.query('DELETE FROM tables WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Table not found' });
        res.json({ message: 'Table deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

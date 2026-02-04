const db = require('../db');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // For simplicity in this demo:
        if (username === 'admin' && password === 'admin123') {
            return res.json({ token: 'mock-token-123', role: 'Admin' });
        }
        if (username === 'staff' && password === 'staff123') {
            return res.json({ token: 'mock-token-staff-123', role: 'Staff' });
        }

        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

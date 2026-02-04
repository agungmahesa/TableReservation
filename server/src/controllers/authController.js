const db = require('../db');

exports.login = (req, res) => {
    const { username, password } = req.body;
    // Generic admin login for MVP since I didn't seed users explicitly with hashed passwords yet.
    // But let's check DB.

    // For simplicity in this demo:
    if (username === 'admin' && password === 'admin123') {
        return res.json({ token: 'mock-token-123', role: 'Admin' });
    }
    if (username === 'staff' && password === 'staff123') {
        return res.json({ token: 'mock-token-staff-123', role: 'Staff' });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
};
